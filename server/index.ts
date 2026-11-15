import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const apiDir = join(root, "server", "api");
const distDir = join(root, "dist");
const ALLOWED_ORIGINS = new Set([
  "https://app.wealthplanner.id",
  "https://wealthplanner.id",
  "http://localhost:5173",
  "http://localhost:4173",
]);

function applyCors(req: IncomingMessage, res: ServerResponse) {
  const origin = String(req.headers.origin || "");
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
}

function parseQuery(req: IncomingMessage) {
  const url = new URL(req.url || "/", "http://" + (req.headers.host || "localhost"));
  const query: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    const current = query[key];
    query[key] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value];
  });
  return { url, query };
}

async function readBody(req: IncomingMessage) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;
  const contentType = String(req.headers["content-type"] || "");
  if (contentType.includes("application/json")) {
    try { return JSON.parse(raw); } catch { return undefined; }
  }
  return raw;
}

function makeResponse(res: ServerResponse) {
  const response: any = {
    status(code: number) { res.statusCode = code; return response; },
    json(payload: unknown) {
      if (!res.headersSent) res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(payload));
      return response;
    },
    send(payload: unknown) {
      if (payload === undefined) return response.json({});
      if (Buffer.isBuffer(payload) || typeof payload === "string") res.end(payload);
      else response.json(payload);
      return response;
    },
    end(payload?: unknown) { res.end(payload as any); return response; },
    setHeader(name: string, value: string | number | readonly string[]) { res.setHeader(name, value); return response; },
    getHeader(name: string) { return res.getHeader(name); },
  };
  return response;
}

async function handleApi(req: IncomingMessage, res: ServerResponse, pathname: string) {
  const route = pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  if (!route) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: "API route tidak ditemukan" }));
  }
  const file = join(apiDir, route + ".ts");
  const normalized = normalize(file);
  if (!normalized.startsWith(apiDir) || !existsSync(normalized)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ error: "API route tidak ditemukan", route }));
  }

  const mod = await import(pathToFileURL(normalized).href);
  if (typeof mod.default !== "function") {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "API handler tidak valid" }));
  }

  const { query } = parseQuery(req);
  const body = await readBody(req);
  const vercelReq: any = Object.assign(req, { url: req.url, query, body, method: req.method });
  const vercelRes = makeResponse(res);
  await mod.default(vercelReq, vercelRes);
}

async function serveStatic(res: ServerResponse, pathname: string) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(join(distDir, requested.replace(/^\/+/, "")));
  const filePath = safePath.startsWith(distDir) ? safePath : join(distDir, "index.html");
  const candidate = existsSync(filePath) ? filePath : join(distDir, "index.html");
  try {
    const data = await readFile(candidate);
    const ext = extname(candidate);
    const types: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    };
    res.statusCode = 200;
    res.setHeader("Content-Type", types[ext] || "application/octet-stream");
    return res.end(data);
  } catch {
    res.statusCode = 404;
    return res.end("Not Found");
  }
}

const port = Number(process.env.PORT || 3000);
createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  try {
    const { url } = parseQuery(req);

    if (url.pathname === "/health") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({ ok: true, service: "wealthplanner-api" }));
    }

    if (url.pathname.startsWith("/api/")) await handleApi(req, res, url.pathname);
    else await serveStatic(res, url.pathname);
  } catch (error) {
    console.error("server error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }));
    }
  }
}).listen(port, "0.0.0.0", () => {
  console.log("WealthPlanner server listening on port " + port);
});
