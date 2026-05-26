import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const packagePath = process.env.ZKPAY_RECEIPT_PACKAGE_PATH ?? "move/zkpay_receipt";
const gasBudget = process.env.ZKPAY_RECEIPT_GAS_BUDGET ?? "100000000";
const dryRun = process.env.ZKPAY_RECEIPT_DRY_RUN === "true";
const passthrough = process.argv.slice(2);
const args = [
  "client",
  "publish",
  packagePath,
  "--gas-budget",
  gasBudget,
  "--json",
  ...passthrough,
];

if (dryRun && !args.includes("--dry-run")) {
  args.push("--dry-run");
}

const child = spawn("sui", args, {
  env: withCertificateEnv(process.env),
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  stdout += chunk;
});
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});
child.on("error", (error) => {
  process.stderr.write(`Failed to run sui: ${error.message}\n`);
  process.exit(1);
});

child.on("exit", (code) => {
  if (stderr.trim()) {
    process.stderr.write(`${stderr.trim()}\n`);
  }

  if (stdout.trim()) {
    process.stdout.write(`${stdout.trim()}\n`);
    printPublishedPackageId(stdout, { dryRun });
  }

  process.exit(code ?? 1);
});

function printPublishedPackageId(output, options = {}) {
  try {
    const parsed = JSON.parse(output);
    const packageId = findPublishedPackageId(parsed);

    if (packageId) {
      const variableName = options.dryRun
        ? "ZKPAY_DRY_RUN_BINDING_PACKAGE_ID"
        : "ZKPAY_BINDING_PACKAGE_ID";

      process.stderr.write(`\n${variableName}=${packageId}\n`);

      if (options.dryRun) {
        process.stderr.write("Dry-run only; package was not published.\n");
      }
    }
  } catch {
    // Sui already printed the useful error/output. Keep the wrapper quiet.
  }
}

function findPublishedPackageId(value) {
  if (!value || typeof value !== "object") return null;

  if (
    value.type === "published" &&
    typeof value.packageId === "string"
  ) {
    return value.packageId;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const packageId = findPublishedPackageId(item);
      if (packageId) return packageId;
    }
  }

  for (const child of Object.values(value)) {
    const packageId = findPublishedPackageId(child);
    if (packageId) return packageId;
  }

  return null;
}

function withCertificateEnv(env) {
  if (env.SSL_CERT_FILE || env.NATIVE_TLS_CERT_FILE) {
    return env;
  }

  const certFile = [
    "/etc/ssl/cert.pem",
    "/opt/homebrew/etc/openssl@3/cert.pem",
    "/opt/homebrew/etc/ca-certificates/cert.pem",
  ].find((path) => existsSync(path));

  if (!certFile) return env;

  return {
    ...env,
    SSL_CERT_FILE: certFile,
    NATIVE_TLS_CERT_FILE: certFile,
  };
}
