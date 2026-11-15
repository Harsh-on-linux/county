import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("dist");
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!file.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      const contents = await readFile(file);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".png": "image/png",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
        }[extname(file)] || "application/octet-stream",
      );
      res.end(contents);
    } catch {
      res.writeHead(404).end();
    }
  })
  .on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.log(
        "County is already running at http://127.0.0.1:4173. Open that address in Chrome or Edge.",
      );
    } else {
      console.error("Could not start County:", error.message);
      process.exitCode = 1;
    }
  })
  .listen(4173, "127.0.0.1", () =>
    console.log("County preview: http://127.0.0.1:4173"),
  );
