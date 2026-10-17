import { getWhatsAppEnquiryUrl } from "@/data/eventContactConfig";
import { cn } from "@/lib/utils";

export interface SponsorshipTierCardProps {
  id: string;
  title: string;
  highlights?: readonly string[] | string[] | undefined;
  description?: string | undefined;
  className?: string | undefined;
}

export function SponsorshipTierCard({
  id: _id,
  title,
  highlights = [],
  description,
  className,
}: SponsorshipTierCardProps) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col justify-between overflow-hidden rounded-[20px] rounded-tr-[32px] bg-[#F6F2E8] p-7 shadow-xs transition-transform duration-300 hover:-translate-y-1 hover:shadow-md sm:p-8",
        className,
      )}
    >
      <div>
        <h3 className="font-display text-xl font-bold uppercase tracking-tight text-[#102C20] sm:text-[22px]">
          {title}
        </h3>

        {description && (
          <p className="mt-2 text-sm leading-relaxed text-[#4F6258]">{description}</p>
        )}

        {highlights && highlights.length > 0 && (
          <ul className="mt-6 space-y-3 text-[14px] leading-normal text-[#4F6258]">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-2.5">
                <span className="select-none font-bold text-[#80954B]" aria-hidden="true">
                  ✓
                </span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 pt-2">
        <a
          href={getWhatsAppEnquiryUrl("SPONSORSHIP", `${title} enquiry`)}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-[50px] w-fit items-center justify-center gap-2 rounded-[13px] bg-[#173D2D] px-5 text-sm font-semibold text-[#F7F5EF] transition-colors hover:bg-[#102C20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
        >
          <span>Enquire About {title}</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}
