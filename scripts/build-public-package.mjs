import {
  chmod,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = join(repoRoot, "packages", "zkpay-sh");
const distRoot = join(packageRoot, "dist");

await rm(distRoot, { recursive: true, force: true });

await copyModule("core");
await copyModule("sdk", {
  "@zkpay/core": "../core/index.js",
});
await copyModule("cli", {
  "@zkpay/sdk": "../sdk/index.js",
});

await writeFile(
  join(distRoot, "index.js"),
  'export * from "./sdk/index.js";\n',
);
await writeFile(
  join(distRoot, "index.d.ts"),
  'export * from "./sdk/index.js";\n',
);
await chmod(join(distRoot, "cli", "index.js"), 0o755);

async function copyModule(name, replacements = {}) {
  const sourceDir = join(repoRoot, "packages", name, "dist");
  const targetDir = join(distRoot, name);

  await copyDistFiles(sourceDir, targetDir, replacements);
}

async function copyDistFiles(sourceDir, targetDir, replacements) {
  await mkdir(targetDir, { recursive: true });

  for (const entry of await readdir(sourceDir)) {
    const sourcePath = join(sourceDir, entry);
    const targetPath = join(targetDir, entry);
    const entryStat = await stat(sourcePath);

    if (entryStat.isDirectory()) {
      await copyDistFiles(sourcePath, targetPath, replacements);
      continue;
    }

    if (!/\.(js|d\.ts)$/.test(entry)) {
      continue;
    }

    let content = await readFile(sourcePath, "utf8");

    for (const [from, to] of Object.entries(replacements)) {
      content = content.replaceAll(`"${from}"`, `"${to}"`);
    }

    content = content.replace(/^\/\/# sourceMappingURL=.*$/gm, "").trimEnd();
    await writeFile(targetPath, `${content}\n`);
  }
}
