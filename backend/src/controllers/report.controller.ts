import type { RequestHandler, Response } from "express";
import { createPublicError } from "../middleware/error.middleware";
import { csvHeader, csvRow } from "../reports/csv";
import {
  ReportExportTooLargeError,
  ReportService,
} from "../services/report.service";
import {
  parseReportDomain,
  parseReportFilters,
} from "../validators/report.validator";

function writeChunk(response: Response, chunk: string): Promise<boolean> {
  if (response.destroyed) return Promise.resolve(false);
  if (response.write(chunk)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const finish = (ready: boolean) => {
      response.off("drain", onDrain);
      response.off("close", onClose);
      resolve(ready);
    };
    const onDrain = () => finish(true);
    const onClose = () => finish(false);
    response.once("drain", onDrain);
    response.once("close", onClose);
  });
}

export function createReportController(service: ReportService) {
  const summary: RequestHandler = async (_request, response, next) => {
    try {
      response
        .status(200)
        .json({ success: true, data: { summary: await service.summary() } });
    } catch (error) {
      next(error);
    }
  };

  const preview: RequestHandler = async (request, response, next) => {
    try {
      const domain = parseReportDomain(String(request.params["domain"] ?? ""));
      if (!domain) {
        next(createPublicError(404, "Report not found"));
        return;
      }
      const filters = parseReportFilters(domain, request.query);
      if (!filters) {
        next(createPublicError(400, "Invalid report filters"));
        return;
      }
      response.status(200).json({
        success: true,
        data: { report: await service.preview(domain, filters) },
      });
    } catch (error) {
      next(error);
    }
  };

  const exportCsv: RequestHandler = async (request, response, next) => {
    try {
      const domain = parseReportDomain(String(request.params["domain"] ?? ""));
      if (!domain) {
        next(createPublicError(404, "Report not found"));
        return;
      }
      const filters = parseReportFilters(domain, request.query);
      if (!filters) {
        next(createPublicError(400, "Invalid report filters"));
        return;
      }
      const adminId = response.locals.admin?.id as string | undefined;
      if (!adminId) {
        next(createPublicError(401, "Authentication required"));
        return;
      }
      const prepared = await service.prepareExport(domain, filters, adminId);
      response.status(200);
      response.setHeader("Content-Type", "text/csv; charset=utf-8");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="aiaiac-2027-${domain}.csv"`,
      );
      response.setHeader("Cache-Control", "no-store, private");
      if (!(await writeChunk(response, `\uFEFF${csvHeader(prepared.columns)}`)))
        return;
      for (
        let offset = 0;
        offset < prepared.total;
        offset += ReportService.exportBatchSize
      ) {
        if (response.destroyed) return;
        const rows = await service.exportRows(domain, filters, offset);
        if (!rows.length) break;
        for (const row of rows) {
          if (!(await writeChunk(response, csvRow(prepared.columns, row))))
            return;
        }
      }
      response.end();
    } catch (error) {
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : undefined);
        return;
      }
      if (error instanceof ReportExportTooLargeError) {
        next(
          createPublicError(
            413,
            "Report exceeds the export limit; narrow your filters",
          ),
        );
        return;
      }
      next(error);
    }
  };

  return { summary, preview, exportCsv };
}
