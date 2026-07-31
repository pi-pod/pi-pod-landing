import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const host = "0.0.0.0";
const port = Number(process.env.PORT ?? 8080);
const publicDir = resolve(fileURLToPath(new URL("../public", import.meta.url)));

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

function applySecurityHeaders(res) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
}

function safePublicPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = normalize(join(publicDir, relative));
  if (candidate !== publicDir && !candidate.startsWith(publicDir + sep)) {
    return null;
  }
  return candidate;
}

async function sendFile(res, filePath, status = 200) {
  const body = await readFile(filePath);
  const type = MIME[extname(filePath)] ?? "application/octet-stream";
  applySecurityHeaders(res);
  res.writeHead(status, {
    "Content-Type": type,
    "Content-Length": body.byteLength,
    "Cache-Control":
      extname(filePath) === ".html"
        ? "no-cache"
        : "public, max-age=3600, stale-while-revalidate=86400",
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      applySecurityHeaders(res);
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/healthz" || url.pathname === "/health") {
      const body = Buffer.from(JSON.stringify({ ok: true, service: "pi-pod-landing" }));
      applySecurityHeaders(res);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": body.byteLength,
        "Cache-Control": "no-store",
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.end(body);
      return;
    }

    const filePath = safePublicPath(url.pathname);
    if (!filePath) {
      applySecurityHeaders(res);
      res.writeHead(400);
      res.end();
      return;
    }

    try {
      await sendFile(res, filePath);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        try {
          await sendFile(res, join(publicDir, "404.html"), 404);
          return;
        } catch {
          applySecurityHeaders(res);
          res.writeHead(404);
          res.end("Not found");
          return;
        }
      }
      throw error;
    }
  } catch (error) {
    console.error(error);
    applySecurityHeaders(res);
    if (!res.headersSent) {
      res.writeHead(500);
    }
    res.end();
  }
});

server.listen(port, host, () => {
  console.log(`pi-pod-landing listening on http://${host}:${port}`);
});
