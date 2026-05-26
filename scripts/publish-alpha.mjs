import { mkdir, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const packages = ["zkpay-sh"];
const token = process.env.NODE_AUTH_TOKEN ?? process.env.NPM_TOKEN;
const npmrcPath = join(".npm-cache", "publish.npmrc");

if (!token) {
  console.error("Missing NODE_AUTH_TOKEN or NPM_TOKEN for npm publish.");
  process.exit(1);
}

await mkdir(".npm-cache", { recursive: true });
await writeFile(
  npmrcPath,
  [
    "registry=https://registry.npmjs.org/",
    `//registry.npmjs.org/:_authToken=${token}`,
    "",
  ].join("\n"),
  { mode: 0o600 },
);

let exitCode = 0;

try {
  run("npm", ["run", "check"]);
  run("npm", ["run", "pack:check"]);

  for (const packageName of packages) {
    const version = readWorkspaceVersion(packageName);

    if (versionExists(packageName, version)) {
      console.log(`${packageName}@${version} already exists; skipping.`);
      continue;
    }

    const publishArgs = [
      "publish",
      "--userconfig",
      npmrcPath,
      "--cache",
      ".npm-cache",
      "-w",
      packageName,
      "--tag",
      "next",
    ];

    if (packageName.startsWith("@")) {
      publishArgs.push("--access", "public");
    }

    run("npm", publishArgs);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  exitCode = 1;
} finally {
  await rm(npmrcPath, { force: true });
}

process.exit(exitCode);

function readWorkspaceVersion(packageName) {
  const workspace = workspaceDirectory(packageName);
  const manifest = JSON.parse(
    readFileSync(join("packages", workspace, "package.json"), "utf8"),
  );

  return manifest.version;
}

function workspaceDirectory(packageName) {
  return packageName.startsWith("@zkpay/")
    ? packageName.replace("@zkpay/", "")
    : packageName;
}

function versionExists(packageName, version) {
  const result = spawnSync(
    "npm",
    ["view", `${packageName}@${version}`, "version", "--cache", ".npm-cache"],
    {
      encoding: "utf8",
      shell: false,
      stdio: "pipe",
      timeout: 60_000,
    },
  );

  return result.status === 0;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    env: process.env,
    shell: false,
    stdio: "inherit",
    timeout: 300_000,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
}
