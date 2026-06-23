// Minimal zero-dependency static server for the built SPA (dist/).
// Used as the Azure App Service (Linux/Node) start command. Binds to
// 0.0.0.0 on the platform-provided PORT and falls back to index.html so
// client-side routes (e.g. /admin/chats) resolve on a hard refresh.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "dist");
const PORT = process.env.PORT || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

async function sendFile(res, filePath, status = 200) {
  const body = await readFile(filePath);
  res.writeHead(status, {
    "Content-Type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream",
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    // Strip query string and prevent path traversal.
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(ROOT, safePath);

    try {
      const s = await stat(filePath);
      if (s.isDirectory()) filePath = join(filePath, "index.html");
      await sendFile(res, filePath);
      return;
    } catch {
      // Not a real file → SPA fallback to index.html.
      await sendFile(res, join(ROOT, "index.html"));
      return;
    }
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
    console.error(err);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Static server listening on 0.0.0.0:${PORT}, serving ${ROOT}`);
});
