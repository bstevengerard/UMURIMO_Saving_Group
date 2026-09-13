import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const BACKEND_URL = "http://127.0.0.1:5000";

async function startServer() {
  const app = express();

  app.use("/api", (req, res) => {
    const options = {
      hostname: "127.0.0.1",
      port: 5000,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: "127.0.0.1:5000" },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
      res.status(502).json({ msg: "Backend unavailable", error: err.message });
    });

    req.pipe(proxyReq);
  });

  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[IKIMINA-MIS Frontend] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start frontend server:", err);
});
