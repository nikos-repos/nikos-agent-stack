import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** The URL only serves a disposable package copy through a loopback dumb-HTTP server. */
export type GitSource = { url: string; root: string; stop(): Promise<void> };

/** Starts a loopback dumb-HTTP server for installer gates without committing in the source checkout. */
export async function startGitSource(): Promise<GitSource> {
  const root = await mkdtemp(join(tmpdir(), "omp-observer-git-"));
  const working = join(root, "working");
  const bare = join(root, "harness", "observer.git");
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? "",
    HOME: root,
    XDG_CONFIG_HOME: join(root, "config"),
    GIT_CONFIG_NOSYSTEM: "1",
  };
  let server: Bun.Server<unknown> | undefined;
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
    await mkdir(join(root, "harness"), { recursive: true });
    await git(["clone", "-q", "--bare", working, bare]);
    await git(["-C", bare, "update-server-info"]);
    server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 404 });
        let pathname: string;
        try {
          pathname = decodeURIComponent(new URL(request.url).pathname);
        } catch {
          return new Response(null, { status: 404 });
        }
        const path = join(root, pathname);
        const pathRelativeToRoot = relative(root, path);
        if (pathRelativeToRoot.startsWith("..") || pathRelativeToRoot === "" || pathRelativeToRoot.split(sep).includes("..")) {
          return new Response(null, { status: 404 });
        }
        try {
          const body = await readFile(path);
          return new Response(request.method === "HEAD" ? null : body);
        } catch {
          return new Response(null, { status: 404 });
        }
      },
    });
    const httpServer = server;
    return {
      url: `git+http://127.0.0.1:${httpServer.port}/harness/${basename(bare)}`,
      root,
      async stop() {
        await httpServer.stop(true);
        await rm(root, { recursive: true, force: true });
      },
    };
  } catch (error) {
    server?.stop(true);
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
