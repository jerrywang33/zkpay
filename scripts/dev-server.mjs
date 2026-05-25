import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = process.cwd();
const port = Number.parseInt(process.env.PORT ?? process.argv[2] ?? "5175", 10);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (request, response) => {
  if (!request.url || !["GET", "HEAD"].includes(request.method ?? "")) {
    response.writeHead(405).end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  const file = await resolveFile(url.pathname);

  response.writeHead(file.status, {
    "content-type": contentTypes[extname(file.path)] ?? "application/octet-stream",
    "cache-control": "no-store",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  response.end(file.body);
});

server.listen(port, () => {
  console.log(`zkpay dev server listening at http://localhost:${port}`);
});

async function resolveFile(pathname) {
  const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.(\/|\\|$))+/, "");
  const requestedPath = resolve(root, `.${safePath}`);

  if (requestedPath.startsWith(root)) {
    const found = await tryReadStaticFile(requestedPath);
    if (found) return found;
  }

  return {
    status: 200,
    path: join(root, "index.html"),
    body: await readFile(join(root, "index.html")),
  };
}

async function tryReadStaticFile(filePath) {
  const target = (await isDirectory(filePath)) ? join(filePath, "index.html") : filePath;

  try {
    return {
      status: 200,
      path: target,
      body: await readFile(target),
    };
  } catch {
    return null;
  }
}

async function isDirectory(filePath) {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}
