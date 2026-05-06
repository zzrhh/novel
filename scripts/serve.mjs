import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://localhost:${port}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const requestedPath = path.normalize(path.join(root, decodedPath === "/" ? "index.html" : decodedPath));

  if (!requestedPath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(requestedPath);
    const filePath = fileStat.isDirectory() ? path.join(requestedPath, "index.html") : requestedPath;
    response.writeHead(200, {
      "content-type": types[path.extname(filePath)] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, host, () => {
  const scriptName = path.basename(fileURLToPath(import.meta.url));
  console.log(`${scriptName}: http://${host}:${port}`);
});
