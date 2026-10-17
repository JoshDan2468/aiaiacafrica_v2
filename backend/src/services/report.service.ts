import type { ReportRepository } from "../repositories/report.repository";
import type { ReportDomain, ReportFilters, ReportPage } from "../types/report";

export class ReportExportTooLargeError extends Error {}

export class ReportService {
  static readonly maxExportRows = 50_000;
  static readonly exportBatchSize = 500;

  constructor(
    private readonly repository: ReportRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async preview(
    domain: ReportDomain,
    filters: ReportFilters,
  ): Promise<ReportPage> {
    const [total, items] = await Promise.all([
      this.repository.count(domain, filters),
      this.repository.rows(
        domain,
        filters,
        (filters.page - 1) * filters.limit,
        filters.limit,
      ),
    ]);
    return {
      domain,
      columns: this.repository.columns(domain),
      items,
      page: filters.page,
      pageSize: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  summary() {
    return this.repository.summary(this.now());
  }

  async prepareExport(
    domain: ReportDomain,
    filters: ReportFilters,
    adminId: string,
  ) {
    const total = await this.repository.count(domain, filters);
    if (total > ReportService.maxExportRows)
      throw new ReportExportTooLargeError();
    await this.repository.auditExport(adminId, domain, filters, this.now());
    return { columns: this.repository.columns(domain), total };
  }

  exportRows(domain: ReportDomain, filters: ReportFilters, offset: number) {
    return this.repository.rows(
      domain,
      filters,
      offset,
      ReportService.exportBatchSize,
    );
  }
}
