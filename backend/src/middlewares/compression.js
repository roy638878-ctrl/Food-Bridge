import zlib from "node:zlib";

/**
 * Lightweight gzip compression middleware for JSON and text API responses (> 1 KB)
 * using Node's built-in zlib module (zero external dependencies).
 */
export function gzipMiddleware(req, res, next) {
  const acceptEncoding = req.headers["accept-encoding"] || "";
  if (!acceptEncoding.includes("gzip")) {
    return next();
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const payload = JSON.stringify(body);
    if (Buffer.byteLength(payload) < 1024 || res.headersSent) {
      return originalJson(body);
    }

    zlib.gzip(payload, (err, compressed) => {
      if (err || res.headersSent) {
        return originalJson(body);
      }
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Length", compressed.length);
      res.send(compressed);
    });
    return res;
  };

  next();
}
