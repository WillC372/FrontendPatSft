// Minimal static server (no dependencies) for local development: node server.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 5500);
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json",
  ".ico": "image/x-icon", ".webp": "image/webp",
};
// Basic security headers for every response.
const security = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};

function send(res, status, body = "", headers = {}) {
  res.writeHead(status, { ...security, ...headers });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, "Método no permitido", { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      send(res, 400, "Solicitud inválida", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const safe = normalize(path).replace(/^([.][.][/\\])+/, "");
    const file = join(root, safe === "/" || safe === sep ? "index.html" : safe);
    const hidden = safe.split(/[/\\]/).some((part) => part.startsWith("."));
    if (!file.startsWith(root) || hidden || file.includes(`${root}node_modules`) || path.includes("\0")) {
      send(res, 403);
      return;
    }
    const body = await readFile(file);
    send(res, 200, req.method === "HEAD" ? "" : body,
      { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
  } catch {
    if (!res.headersSent) send(res, 404, "No encontrado", { "Content-Type": "text/plain; charset=utf-8" });
  }
}).listen(port, () => console.log(`AquaSense AI frontend en http://localhost:${port}`));
