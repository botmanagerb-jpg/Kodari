import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { startManager } from "./bot/manager";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // API to list bots (for frontend)
  app.get(api.bots.list.path, async (req, res) => {
    const bots = await storage.getBots();
    // sanitize tokens?
    const sanitized = bots.map(b => ({ ...b, token: "***" }));
    res.json(sanitized);
  });

  // Start Discord Manager
  startManager().catch(console.error);

  return httpServer;
}
