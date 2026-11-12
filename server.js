const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff"
};

function sendError(response, status) {
  const messages = {
    400: "Bad request",
    403: "Forbidden",
    404: "Not found",
    405: "Method not allowed"
  };
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(messages[status] || "Error");
}

const server = http.createServer(function (request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendError(response, 405);
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch (error) {
    sendError(response, 400);
    return;
  }

  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  const filePath = path.resolve(root, "." + pathname);

  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    sendError(response, 403);
    return;
  }

  fs.stat(filePath, function (statError, stats) {
    if (statError || !stats.isFile()) {
      sendError(response, 404);
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Content-Length": stats.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    };

    response.writeHead(200, headers);

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on("error", function () {
      if (!response.headersSent) {
        sendError(response, 500);
      } else {
        response.destroy();
      }
    });
    stream.pipe(response);
  });
});

server.listen(port, host, function () {
  console.log("CDPC Puchong is live at http://" + host + ":" + port);
});
