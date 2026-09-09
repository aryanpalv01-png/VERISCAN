import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { createServer } from "http";
import net from "net";
import { spawn, ChildProcess } from "child_process";
import { createApp } from "./app";
import { setupVite } from "./_core/vite";

let workerProcess: ChildProcess | null = null;

async function ensureForensicWorkerRunning(): Promise<void> {
  const workerUrl = process.env.FORENSIC_WORKER_URL || "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${workerUrl.replace(/\/+$/, "")}/health`, { signal: AbortSignal.timeout(1200) });
    if (res.ok) {
      console.log(`[ForensicWorker] Worker is online and healthy at ${workerUrl}`);
      return;
    }
  } catch {
    // Port 8000 is not responding, attempt to spawn it
  }

  const venvUvicorn = path.resolve(process.cwd(), "services/forensic-worker/venv/bin/uvicorn");
  const workerDir = path.resolve(process.cwd(), "services/forensic-worker");

  if (fs.existsSync(venvUvicorn)) {
    console.log(`[ForensicWorker] Launching Python forensic worker on port 8000...`);
    workerProcess = spawn(venvUvicorn, ["app:app", "--host", "127.0.0.1", "--port", "8000"], {
      cwd: workerDir,
      stdio: "inherit",
    });

    workerProcess.on("error", (err) => {
      console.error("[ForensicWorker] Failed to launch worker:", err);
    });

    const cleanup = () => {
      if (workerProcess && !workerProcess.killed) {
        try {
          workerProcess.kill("SIGTERM");
        } catch {}
      }
    };

    process.once("exit", cleanup);
    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);

    // Poll up to 10 seconds for worker to bind and respond to /health
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const res = await fetch(`${workerUrl.replace(/\/+$/, "")}/health`, { signal: AbortSignal.timeout(500) });
        if (res.ok) {
          console.log(`[ForensicWorker] Worker successfully bound and ready on port 8000`);
          break;
        }
      } catch {}
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Resolves static directory for Vite production build output.
 * Checks both path.join(__dirname, "public") and path.join(__dirname, "../public")
 * depending on how esbuild bundles dist/index.js, with cwd fallbacks.
 */
export function getStaticPath(): string {
  const candidates = [
    path.join(__dirname, "public"),
    path.join(__dirname, "../public"),
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(process.cwd(), "dist"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  // Default fallback
  return fs.existsSync(path.join(__dirname, "public"))
    ? path.join(__dirname, "public")
    : path.join(__dirname, "../public");
}

async function startServer() {
  await ensureForensicWorkerRunning();
  const app = createApp();
  const server = createServer(app);

  // Static files and client-side routing
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    const staticPath = getStaticPath();
    const indexPath = path.join(staticPath, "index.html");

    // 1. Serve static files from Vite build output folder (dist/public)
    app.use(express.static(staticPath));

    // 2. Catch-all route to return index.html for client-side routing
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
      }

      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Frontend build not found. Please build the client first.");
      }
    });
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);

export { startServer };
