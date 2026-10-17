import type { RequestHandler } from "express";
import type { AdminOverviewService } from "../services/adminOverview.service";

export function createAdminOverviewController(service: AdminOverviewService) {
  const getOverview: RequestHandler = async (_request, response, next) => {
    try {
      const overview = await service.getOverview();
      response.status(200).json({ success: true, data: { overview } });
    } catch (error) {
      next(error);
    }
  };
  return { getOverview };
}
