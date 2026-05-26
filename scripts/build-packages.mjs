import { chmod, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const packages = ["core", "sdk", "api", "cli"];

for (const name of packages) {
  await rm(join("packages", name, "dist"), { recursive: true, force: true });
  run("npx", ["tsc", "-p", join("packages", name, "tsconfig.build.json")]);
}

await chmod(join("packages", "cli", "dist", "index.js"), 0o755);

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
