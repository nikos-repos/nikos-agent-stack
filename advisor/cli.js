#!/usr/bin/env bun
import { installadvisor } from "./install.js";

function run(argv) {
  if (argv[0] !== "install") { console.error(`advisor: unknown subcommand "${argv[0] ?? ""}"`); console.error("usage: nikos-advisor install [model]"); return 2; }
  if (argv.length > 2) { console.error("advisor install: unexpected arguments"); return 2; }
  try {
    const file = installadvisor(argv[1]);
    console.log(`advisor install: installed terra at ${file}`);
    console.log("start a new omp session to activate the advisor");
    return 0;
  } catch (error) { console.error(`advisor install: ${error instanceof Error ? error.message : String(error)}`); return 2; }
}
process.exit(run(process.argv.slice(2)));
