import type { RequestHandler } from "express";
import { env } from "../config/env";

export const getHealth: RequestHandler = (_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    success: true,
    message: "AIAIAC API is running",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
};
