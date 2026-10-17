/**
 * Homepage-only display configuration.
 *
 * These entries deliberately remain separate from sponsors and speaker organisations:
 * participating companies can only be shown after organisers approve their names and logos.
 */
export type ParticipatingCompany = {
  id: string;
  name: string;
  logo: string;
};

export const participatingCompanies: readonly ParticipatingCompany[] = [];

/**
 * A count-up target is enabled only after an organiser confirms the figure.
 * Until then, every public statistic is intentionally presented as pending.
 */
export type HomePageStatistic = {
  id: "delegates" | "countries" | "speakers" | "exhibitors";
  label: string;
  value: number | null;
  suffix?: string;
  status: string;
};

export const homepageStatistics: readonly HomePageStatistic[] = [
  {
    id: "delegates",
    label: "Delegates",
    value: null,
    status: "Awaiting organiser confirmation",
  },
  {
    id: "countries",
    label: "Countries represented",
    value: null,
    status: "Awaiting organiser confirmation",
  },
  {
    id: "speakers",
    label: "Industry speakers",
    value: null,
    status: "Awaiting organiser confirmation",
  },
  {
    id: "exhibitors",
    label: "Exhibitors",
    value: null,
    status: "Awaiting organiser confirmation",
  },
];
