import { once } from "node:events";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** The URL only serves a disposable copy of the package through loopback git daemon. */
export type GitSource = { url: string; root: string; stop(): Promise<void> };

/** Starts a local git daemon for installer gates without committing in the source checkout. */
export async function startGitSource(): Promise<GitSource> {
  const root = await mkdtemp(join(tmpdir(), "omp-observer-git-"));
  const working = join(root, "working");
  const bare = join(root, "observer.git");
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? "",
    HOME: root,
    XDG_CONFIG_HOME: join(root, "config"),
    GIT_CONFIG_NOSYSTEM: "1",
  };
  let daemon: { kill(): void; exited: Promise<number> } | undefined;
  try {
    await mkdir(env.XDG_CONFIG_HOME, { recursive: true });
    const source = fileURLToPath(new URL("../../", import.meta.url));
    await cp(source, working, {
      recursive: true, filter: path => {
        const relative = path.slice(source.length).split(sep);
        return !relative.some(segment => segment === ".git" || segment === "node_modules");
      }
    });
    async function git(args: string[]): Promise<void> {
      const proc = Bun.spawn(["git", ...args], { cwd: root, env, stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
      ]);
      if (exitCode !== 0) throw new Error(`Disposable git ${args[0]} failed: ${stderr || stdout}`);
    }
    await git(["init", "-q", working]);
    await git(["-C", working, "add", "-A"]);
    await git(["-C", working, "-c", "user.name=Harness Fixture", "-c", "user.email=harness@invalid.example", "commit", "-qm", "Harness package fixture"]);
    await git(["clone", "-q", "--bare", working, bare]);
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const address = reservation.address();
    if (!address || typeof address === "string") throw new Error("No loopback git port");
    const port = address.port;
    const closed = once(reservation, "close");
    reservation.close();
    await closed;
    daemon = Bun.spawn(["git", "daemon", "--reuseaddr", "--export-all", `--base-path=${root}`,
      "--listen=127.0.0.1", `--port=${port}`, bare], {
      cwd: root, env, stdout: "ignore", stderr: "ignore",
    });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const socket = createConnection({ host: "127.0.0.1", port });
        await once(socket, "connect");
        socket.destroy();
        ready = true;
        break;
      } catch {
        await Bun.sleep(50);
      }
    }
    if (!ready) throw new Error("Disposable git daemon did not bind loopback");
    const server = daemon;
    return {
      url: `git://127.0.0.1:${port}/${basename(bare)}`,
      root,
      async stop() {
        server.kill();
        await server.exited;
        await rm(root, { recursive: true, force: true });
      },
    };
  } catch (error) {
    daemon?.kill();
    if (daemon) await daemon.exited;
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
