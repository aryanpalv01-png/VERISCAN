import "dotenv/config";
import path from "path";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

export function createApp() {
  const app = express();

  // Body parser & upload endpoints
  app.use(express.json({ limit: "50mb" }));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Dedicated health check endpoints
  app.get(["/health", "/api/health"], (_req, res) => {
    res.status(200).json({ status: "healthy", service: "veriscan-node-server" });
  });

  // Direct document analysis endpoint
  app.post("/api/analyze-direct", async (req, res) => {
    try {
      const { fileName, mimeType, fileSize, documentType, contentBase64 } = req.body;
      if (!contentBase64) {
        return res.status(400).json({ error: "Missing contentBase64" });
      }
      const buffer = Buffer.from(contentBase64, "base64");
      const { runForensicAnalysis } = await import("./forensics");
      const analysis = await runForensicAnalysis({
        filename: fileName || "upload",
        mimeType: mimeType || "image/jpeg",
        fileSize: fileSize || buffer.length,
        documentType: documentType || "other",
        content: buffer,
      });
      const referenceCode = `VS-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
      res.json({
        id: `scan-${Date.now()}`,
        referenceCode,
        status: analysis.status,
        confidenceScore: analysis.score,
        score: analysis.score,
        checks: analysis.checks,
        extractedFields: analysis.extractedFields,
        comparisonFindings: analysis.comparisonFindings,
        providerHealth: analysis.providerHealth,
        summary: analysis.summary,
        systemError: analysis.systemError,
        previewUrl: `data:${mimeType || "image/jpeg"};base64,${contentBase64}`,
      });
    } catch (err: any) {
      console.error("Direct analysis error:", err);
      res.status(500).json({ error: err?.message || "Internal analysis error" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}

const defaultApp = createApp();
export default defaultApp;

