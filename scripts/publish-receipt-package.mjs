import { spawn } from "node:child_process";

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
    printPublishedPackageId(stdout);
  }

  process.exit(code ?? 1);
});

function printPublishedPackageId(output) {
  try {
    const parsed = JSON.parse(output);
    const packageId = findPublishedPackageId(parsed);

    if (packageId) {
      process.stderr.write(`\nZKPAY_BINDING_PACKAGE_ID=${packageId}\n`);
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
