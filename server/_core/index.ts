import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeScheduler } from "./scheduler";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Killing existing process and retrying...`);
      // ポートを強制的に解放して再起動
      const { execSync } = require('child_process');
      try {
        execSync(`fuser -k ${port}/tcp 2>/dev/null || true`);
      } catch (_) {}
      setTimeout(() => {
        server.close();
        server.listen(port, '0.0.0.0', () => {
          console.log(`Server running on http://localhost:${port}/`);
          initializeScheduler();
        });
      }, 1000);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Initialize cron jobs
    initializeScheduler();
  });
}

startServer().catch(console.error);
