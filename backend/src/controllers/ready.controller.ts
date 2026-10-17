import type { RequestHandler } from "express";
import { checkDatabaseConnection } from "../config/database";

export type DatabaseConnectionCheck = () => Promise<void>;

export function createGetReady(
  checkConnection: DatabaseConnectionCheck = checkDatabaseConnection,
): RequestHandler {
  return async (_request, response) => {
    response.setHeader("Cache-Control", "no-store");

    try {
      await checkConnection();
      response.status(200).json({
        success: true,
        message: "AIAIAC API is ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch {
      response.status(503).json({
        success: false,
        message: "AIAIAC API is not ready",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      });
    }
  };
}
