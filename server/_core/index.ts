import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

type DrawerPendingRequest = {
  id: string;
  timestamp: number;
};

const drawerPendingQueue: DrawerPendingRequest[] = [];

export function queueDrawerOpen(): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  drawerPendingQueue.push({
    id,
    timestamp: Date.now(),
  });
  return id;
}

export function getPendingDrawerRequest(): DrawerPendingRequest | null {
  return drawerPendingQueue[0] ?? null;
}

export function acknowledgeDrawerRequest(id: string): boolean {
  const index = drawerPendingQueue.findIndex((request) => request.id === id);
  if (index === -1) {
    return false;
  }

  drawerPendingQueue.splice(index, 1);
  return true;
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
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

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.post("/api/open-drawer", (_req, res) => {
    const id = queueDrawerOpen();
    console.log(`[drawer] Open request queued: ${id}`);
    res.json({ ok: true, id, timestamp: Date.now(), queueLength: drawerPendingQueue.length });
  });

  app.get("/api/drawer-pending", (_req, res) => {
    const pending = getPendingDrawerRequest();
    res.json({ pending, queueLength: drawerPendingQueue.length });
  });

  app.post("/api/drawer-ack", (req, res) => {
    const id = typeof req.body?.id === "string" ? req.body.id : "";

    if (!id) {
      res.status(400).json({ ok: false, error: "Missing request id" });
      return;
    }

    const removed = acknowledgeDrawerRequest(id);
    res.json({ ok: removed, id, queueLength: drawerPendingQueue.length });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
