import { ActionLink } from "@/components/common/ActionButton";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { createBreadcrumbSchema } from "@/components/common/SEO";
import { previousEdition } from "@/data/event";
import { sponsorTiers, sponsors } from "@/data/sponsors";
import type { SponsorTier } from "@/types";

export function PartnerArchiveCategoryPage({ tierId }: { tierId: SponsorTier["id"] }) {
  const tier = sponsorTiers.find((item) => item.id === tierId);
  const items = sponsors.filter((item) => item.tier === tierId);

  if (!tier) {
    return (
      <PublicPageLayout
        title="Partner Archive | AIAIAC Africa 2027"
        description="Partner archive unavailable."
        noindex={true}
      >
        <section className="bg-muted py-32">
          <div className="shell max-w-3xl">
            <p className="eyebrow text-emerald-deep">Archive unavailable</p>
            <h1 className="display-lg mt-5 text-mineral">This partner archive is unavailable.</h1>
            <ActionLink to="/sponsorship" variant="outline" className="mt-8 text-mineral">
              Return to sponsorship
            </ActionLink>
          </div>
        </section>
      </PublicPageLayout>
    );
  }

  return (
    <PublicPageLayout
      title={`${tier.label} Archive | AIAIAC Africa 2027`}
      description={`Previous-edition ${tier.label.toLowerCase()} archive for AIAIAC Africa.`}
      schema={createBreadcrumbSchema([
        { name: "Home", item: "/" },
        { name: "Sponsorship", item: "/sponsorship" },
        { name: `${tier.label} Archive`, item: `/sponsorship/${tier.id}` },
      ])}
    >
      <section className="on-navy relative overflow-hidden bg-mineral pb-16 pt-32 sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-40">
        <div className="grid-lines absolute inset-0 opacity-25" aria-hidden />
        <div className="shell relative max-w-5xl">
          <p className="eyebrow text-emerald">{previousEdition.label}</p>
          <h1 className="display-xl mt-6 text-white">{tier.label} archive</h1>
          <p className="mt-7 max-w-2xl border-l-2 border-emerald pl-5 text-base leading-relaxed text-white/72 sm:text-lg">
            These organisations and logos are retained as historical evidence only. They do not
            indicate confirmed 2027 participation or package structure.
          </p>
        </div>
      </section>

      <section className="bg-muted py-20 sm:py-24 lg:py-28" aria-labelledby="archive-logos-title">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-7">
            <div>
              <p className="eyebrow text-emerald-deep">{previousEdition.label}</p>
              <h2 id="archive-logos-title" className="display-md mt-4 text-mineral">
                {tier.label}
              </h2>
            </div>
            <ActionLink to="/sponsorship" variant="outline" size="sm" className="text-mineral">
              All archive groups
            </ActionLink>
          </div>

          {items.length ? (
            <ul className="mt-10 grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">
              {items.map((item) => (
                <li key={item.id} className="bg-background">
                  <div className="flex min-h-36 items-center justify-center p-6 sm:min-h-40">
                    <img
                      src={item.logo}
                      alt={item.name ?? `${tier.label} organisation logo`}
                      width="180"
                      height="72"
                      loading="lazy"
                      decoding="async"
                      className="max-h-16 w-auto max-w-full object-contain"
                    />
                  </div>
                  {item.name && (
                    <p className="border-t border-border px-5 py-3 text-xs font-medium text-mineral">
                      {item.name}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-10 border border-border bg-background p-8 sm:p-10">
              <p className="eyebrow text-emerald-deep">Archive update pending</p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                No verified logos have been recorded for this previous-edition archive group.
              </p>
            </div>
          )}
        </div>
      </section>
    </PublicPageLayout>
  );
}
