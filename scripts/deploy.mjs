import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const root = process.cwd();
const deployDir = join(tmpdir(), "zkpay-site-deploy");
const files = [
  "index.html",
  "app.js",
  "checkout.js",
  "styles.css",
  "favicon.svg",
  "_redirects",
];

await import("./build-docs.mjs");
await import("./build-checkout.mjs");
await rm(deployDir, { recursive: true, force: true });
await mkdir(deployDir, { recursive: true });

await Promise.all(
  files.map((file) => copyFile(join(root, file), join(deployDir, file))),
);
await cp(join(root, "docs"), join(deployDir, "docs"), { recursive: true });

const child = spawn(
  "npx",
  ["wrangler", "pages", "deploy", deployDir, "--project-name=zkpay-sh"],
  {
    stdio: "inherit",
    shell: false,
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
