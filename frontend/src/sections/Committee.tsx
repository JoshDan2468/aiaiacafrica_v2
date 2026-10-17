import { useState } from "react";
import { committeeIntro, technicalChairman, technicalCommittees } from "@/data/committee";
import { Reveal } from "@/components/common/Reveal";
import type { TechnicalCommittee } from "@/types";

function getInitials(name: string): string {
  const cleaned = name
    .replace(/\b(Engr\.|Dr\.|Prof\.|Architect|Sir|\(Engr\.\)|Dr\)\.?)\b/gi, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return "TC";
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  const fChar = first[0] ?? "";
  const lChar = last[0] ?? "";
  return (fChar + lChar).toUpperCase() || "TC";
}

const defaultCommittee: TechnicalCommittee = technicalCommittees[0] as TechnicalCommittee;

export function Committee() {
  const [activeSlug, setActiveSlug] = useState("asset-integrity");
  const activeCommittee =
    technicalCommittees.find((c) => c.slug === activeSlug) ?? defaultCommittee;

  return (
    <section id="committee" className="on-navy relative overflow-hidden py-24 lg:py-32">
      <div className="grid-lines absolute inset-0 opacity-30" aria-hidden />
      <div className="shell relative">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="eyebrow text-emerald">Technical Committee</p>
              <h2 className="display-lg mt-6 text-white">Setting the technical direction</h2>
              <p className="mt-8 max-w-md text-base leading-relaxed text-white/70">
                {committeeIntro}
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.12} className="lg:col-span-6 lg:col-start-7">
            <article className="image-cut relative min-h-100 overflow-hidden bg-forest sm:min-h-112">
              <div className="absolute inset-0 grid-lines opacity-35" aria-hidden />
              {technicalChairman.image && (
                <img
                  src={technicalChairman.image}
                  alt={`Portrait of ${technicalChairman.name}`}
                  loading="lazy"
                  decoding="async"
                  className="absolute bottom-0 right-[-5%] h-[88%] w-[66%] object-contain object-bottom grayscale sm:h-[96%]"
                />
              )}
              <div className="relative z-10 flex min-h-[25rem] max-w-[72%] flex-col justify-end p-8 sm:min-h-[28rem] sm:p-10">
                <p className="eyebrow text-emerald">Technical Committee Chairman</p>
                <h3 className="display-md mt-5 max-w-sm text-white">{technicalChairman.name}</h3>
                <p className="mt-4 text-sm font-semibold text-white/80">{technicalChairman.role}</p>
                <p className="mt-1 max-w-xs text-sm text-white/55">
                  {technicalChairman.organisation}
                </p>
              </div>
            </article>
          </Reveal>
        </div>

        <div className="mt-12 flex flex-wrap gap-3 border-y border-white/12 py-5">
          {technicalCommittees.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setActiveSlug(cat.slug)}
              className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-colors ${
                cat.slug === activeSlug
                  ? "bg-lime text-[#05190F]"
                  : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              {cat.name} ({cat.members.length})
            </button>
          ))}
        </div>

        {activeCommittee && (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {activeCommittee.members.map((m, i) => {
              const initials = getInitials(m.name);
              return (
                <Reveal as="li" key={m.id} delay={(i % 4) * 0.05}>
                  <article className="group flex h-full flex-col justify-between border-l border-white/16 bg-white/[0.035] p-5 transition-colors duration-500 hover:bg-white/[0.075]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-lime/30 bg-lime/10 font-mono text-sm font-bold text-lime">
                      {initials}
                    </div>
                    <div className="mt-6">
                      <h3 className="font-display text-base font-bold leading-tight text-white">
                        {m.name}
                      </h3>
                      <p className="mt-1.5 text-xs text-white/65">{m.role}</p>
                      <p className="mt-1 text-xs font-medium text-lime">{m.organisation}</p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
