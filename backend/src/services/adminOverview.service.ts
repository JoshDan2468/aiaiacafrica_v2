import type { AdminOverviewRepository } from "../repositories/adminOverview.repository";

export class AdminOverviewService {
  constructor(private readonly repository: AdminOverviewRepository) {}

  getOverview() {
    return this.repository.getOverview();
  }
}
