import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

const pages = [
  {
    input: "docs/v0.1.md",
    output: "docs/v0.1.html",
    title: "v0.1 Product Contract",
    description: "The first zkpay payment model: intent, checkout, gas route, and receipt verification.",
  },
  {
    input: "docs/api.md",
    output: "docs/api.html",
    title: "API Reference",
    description: "Hono API routes for creating payments and verifying receipts.",
  },
  {
    input: "docs/architecture.md",
    output: "docs/architecture.html",
    title: "Architecture",
    description: "How the core package, SDK, API, CLI, checkout, and merchant systems fit together.",
  },
  {
    input: "docs/zklogin.md",
    output: "docs/zklogin.html",
    title: "zkLogin Boundary",
    description: "Where zkLogin fits in the checkout flow and where v0.1 deliberately stops.",
  },
  {
    input: "docs/sui-gas-routing.md",
    output: "docs/sui-gas-routing.html",
    title: "Sui Gas Routing",
    description: "Route order and policy for gasless stablecoin transfers, sponsor fallback, and payer-paid fallback.",
  },
  {
    input: "docs/roadmap.md",
    output: "docs/roadmap.html",
    title: "Roadmap",
    description: "The staged path from model-first v0.1 to merchant operations.",
  },
  {
    input: "docs/decisions/0001-model-first.md",
    output: "docs/decisions/0001-model-first.html",
    title: "ADR 0001: Model First",
    description: "Why zkpay starts from the product contract instead of a wallet button.",
  },
];

for (const page of pages) {
  const markdown = await readFile(page.input, "utf8");
  const html = renderPage(page, markdown);

  await mkdir(dirname(page.output), { recursive: true });
  await writeFile(page.output, `${html}\n`);
}

function renderPage(page, markdown) {
  const body = renderMarkdown(stripFrontmatter(markdown));
  const pageDir = dirname(page.output);
  const cssHref = normalizeHref(relative(pageDir, "docs/docs.css"));
  const indexHref = normalizeHref(relative(pageDir, "docs/index.html"));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(page.title)} - zkpay docs</title>
    <meta name="description" content="${escapeHtml(page.description)}" />
    <link rel="stylesheet" href="${cssHref}" />
  </head>
  <body>
    <div class="shell">
      <header>
        <a class="brand" href="${indexHref}" aria-label="zkpay docs home">
          <span aria-hidden="true">💧</span>
          <span>zkpay docs</span>
        </a>
        <nav class="nav" aria-label="Docs navigation">
          <a href="${indexHref}">Docs</a>
          <a href="https://zkpay.sh">Website</a>
          <a href="https://github.com/jerrywang33/zkpay">GitHub</a>
          <a href="https://x.com/jerrydev90">X</a>
        </nav>
      </header>

      <main>
        <p class="eyebrow">zkpay docs</p>
        <h1>${escapeHtml(page.title)}</h1>
        <p class="lede">${escapeHtml(page.description)}</p>
        <div class="docs-layout">
          <aside class="side-nav">
            ${renderSideNav(page.output)}
          </aside>
          <article class="doc-body">
            ${body}
          </article>
        </div>
      </main>
    </div>
  </body>
</html>`;
}

function renderSideNav(currentOutput) {
  const currentDir = dirname(currentOutput);
  const links = [
    ["Overview", "docs/index.html"],
    ["v0.1", "docs/v0.1.html"],
    ["API", "docs/api.html"],
    ["Architecture", "docs/architecture.html"],
    ["zkLogin", "docs/zklogin.html"],
    ["Gas routing", "docs/sui-gas-routing.html"],
    ["Roadmap", "docs/roadmap.html"],
    ["ADR 0001", "docs/decisions/0001-model-first.html"],
  ];

  return links
    .map(([label, target]) => {
      const href = normalizeHref(relative(currentDir, target));
      const aria = resolve(target) === resolve(currentOutput) ? ' aria-current="page"' : "";
      return `<a href="${href}"${aria}>${label}</a>`;
    })
    .join("\n            ");
}

function renderMarkdown(markdown) {
  const lines = markdown.trim().split(/\r?\n/);
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const { block, nextIndex } = readCodeBlock(lines, index);
      output.push(block);
      index = nextIndex;
      continue;
    }

    if (line.startsWith("### ")) {
      output.push(`<h3>${renderInline(line.slice(4))}</h3>`);
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      output.push(`<section><h2>${renderInline(line.slice(3))}</h2>`);
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const { table, nextIndex } = readTable(lines, index);
      output.push(table);
      index = nextIndex;
      continue;
    }

    if (line.startsWith("- ")) {
      const { list, nextIndex } = readList(lines, index);
      output.push(list);
      index = nextIndex;
      continue;
    }

    const { paragraph, nextIndex } = readParagraph(lines, index);
    output.push(paragraph);
    index = nextIndex;
  }

  return closeOpenSections(output.join("\n"));
}

function readCodeBlock(lines, startIndex) {
  const language = lines[startIndex].slice(3).trim();
  const code = [];
  let index = startIndex + 1;

  while (index < lines.length && !lines[index].startsWith("```")) {
    code.push(lines[index]);
    index += 1;
  }

  const className = language ? ` class="language-${escapeHtml(language)}"` : "";

  return {
    block: `<pre><code${className}>${escapeHtml(code.join("\n"))}</code></pre>`,
    nextIndex: index + 1,
  };
}

function readList(lines, startIndex) {
  const items = [];
  let index = startIndex;

  while (index < lines.length && lines[index].startsWith("- ")) {
    let value = lines[index].slice(2);
    index += 1;

    while (index < lines.length && lines[index].startsWith("  ")) {
      value += ` ${lines[index].trim()}`;
      index += 1;
    }

    items.push(`<li>${renderInline(value)}</li>`);
  }

  return {
    list: `<ul>\n${items.join("\n")}\n</ul>`,
    nextIndex: index,
  };
}

function readParagraph(lines, startIndex) {
  const parts = [];
  let index = startIndex;

  while (
    index < lines.length &&
    lines[index].trim() &&
    !lines[index].startsWith("#") &&
    !lines[index].startsWith("- ") &&
    !lines[index].startsWith("```") &&
    !isTableStart(lines, index)
  ) {
    parts.push(lines[index].trim());
    index += 1;
  }

  return {
    paragraph: `<p>${renderInline(parts.join(" "))}</p>`,
    nextIndex: index,
  };
}

function readTable(lines, startIndex) {
  const headers = splitTableRow(lines[startIndex]);
  const rows = [];
  let index = startIndex + 2;

  while (index < lines.length && lines[index].includes("|")) {
    rows.push(splitTableRow(lines[index]));
    index += 1;
  }

  const headerHtml = headers
    .map((cell) => `<th>${renderInline(cell)}</th>`)
    .join("");
  const rowsHtml = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`,
    )
    .join("\n");

  return {
    table: `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`,
    nextIndex: index,
  };
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableStart(lines, index) {
  return (
    lines[index]?.includes("|") &&
    lines[index + 1]?.trim().startsWith("|") &&
    /^[-|: ]+$/.test(lines[index + 1].trim())
  );
}

function renderInline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---[\s\S]*?---\s*/, "");
}

function closeOpenSections(html) {
  const firstSectionIndex = html.indexOf("<section>");

  if (firstSectionIndex === -1) {
    return `<section>${html}</section>`;
  }

  const intro = html.slice(0, firstSectionIndex).trim();
  const sections = html
    .slice(firstSectionIndex)
    .replace(/<section>/g, "</section><section>")
    .replace(/^<\/section>/, "");

  return `${intro ? `<section>${intro}</section>\n` : ""}${sections}</section>`;
}

function normalizeHref(value) {
  return value.replace(/\\/g, "/");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
