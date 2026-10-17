import { ActionLink } from "@/components/common/ActionButton";
import { MagneticCard } from "@/components/common/MagneticCard";
import type { RegistrationOption } from "@/types";

export function RegistrationTypeCard({
  option,
  index,
}: {
  option: RegistrationOption;
  index: number;
}) {
  return (
    <MagneticCard className="h-full">
      <article className="flex h-full min-h-[27rem] flex-col border border-border bg-background p-7 transition-[border-color,background-color,box-shadow] duration-500 hover:border-forest/55 hover:bg-white hover:shadow-[0_28px_70px_oklch(0.18_0.04_155/.1)] sm:p-9">
        <div className="flex items-center gap-4">
          <span className="numeral text-sm text-emerald-deep">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>
        <p className="eyebrow mt-10 text-emerald-deep">Current registration type</p>
        <h2 className="display-md mt-5 text-mineral">{option.title}</h2>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{option.description}</p>
        <ul className="mt-7 space-y-2 border-t border-border pt-6">
          {option.benefits.map((benefit) => (
            <li key={benefit} className="flex gap-3 text-xs leading-relaxed text-muted-foreground">
              <span className="mt-2 h-1 w-1 shrink-0 bg-emerald-deep" aria-hidden />
              {benefit}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-8">
          <ActionLink to={option.route} size="lg" className="w-full">
            {option.cta}
          </ActionLink>
        </div>
      </article>
    </MagneticCard>
  );
}
