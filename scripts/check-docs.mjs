import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const docsDir = resolve("docs");
const htmlFiles = listHtmlFiles(docsDir);
const errors = [];

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

  for (const href of hrefs) {
    if (isExternalHref(href)) continue;

    const withoutHash = href.split("#")[0];
    if (!withoutHash) continue;

    const target = resolve(dirname(file), withoutHash);

    if (!target.startsWith(docsDir) || !existsSync(target)) {
      errors.push(`${file}: missing local href ${href}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

function listHtmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return listHtmlFiles(path);
    if (entry.isFile() && entry.name.endsWith(".html")) return [path];
    return [];
  });
}

function isExternalHref(href) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("#")
  );
}
