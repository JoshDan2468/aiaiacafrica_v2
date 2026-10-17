import { motion } from "motion/react";
import { conference } from "@/data/conference";
import { useCountdown } from "@/hooks/useCountdown";

const ease = [0.16, 1, 0.3, 1] as const;

function units(parts: ReturnType<typeof useCountdown>) {
  return [
    { label: "Days", value: parts?.days },
    { label: "Hours", value: parts?.hours },
    { label: "Minutes", value: parts?.minutes },
    { label: "Seconds", value: parts?.seconds },
  ];
}

const pad = (n?: number) => (n === undefined ? "––" : String(n).padStart(2, "0"));

/** Compact countdown module used inside the hero's conference-poster stage. */
export function HeroCountdown() {
  const parts = useCountdown(conference.startsAtISO);

  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.75, duration: 0.75, ease }}
      className="border border-white/22 bg-navy-900/82 p-3 shadow-[0_18px_50px_oklch(0.12_0.03_250/.38)] backdrop-blur-md sm:p-4"
      aria-label="Countdown to AIAC West Africa 2026"
    >
      <p className="mb-3 flex items-center gap-2 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/72 sm:text-[0.62rem]">
        <span className="h-1.5 w-1.5 bg-emerald" aria-hidden />
        Get ready for AIAIAC
      </p>
      <dl className="grid grid-cols-3 divide-x divide-white/15 border-y border-white/12">
        {units(parts)
          .slice(0, 3)
          .map((unit) => (
            <div
              key={unit.label}
              className="min-w-0 px-3 py-2 text-center first:pl-1 last:pr-1 sm:px-4"
            >
              <dd className="numeral text-2xl leading-none text-white sm:text-3xl">
                {pad(unit.value)}
              </dd>
              <dt className="mt-1.5 font-mono text-[0.48rem] uppercase tracking-[0.16em] text-white/48 sm:text-[0.54rem]">
                {unit.label}
              </dt>
            </div>
          ))}
      </dl>
    </motion.aside>
  );
}

/** Full-width countdown feature section. */
export function CountdownSection() {
  const parts = useCountdown(conference.startsAtISO);

  return (
    <section
      className="on-navy relative overflow-hidden py-24 lg:py-32"
      aria-label="Countdown to AIAC West Africa 2026"
    >
      <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute -right-40 top-1/2 h-[38rem] w-[38rem] -translate-y-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--emerald), transparent 65%)" }}
        aria-hidden
      />
      <div className="shell relative">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="eyebrow text-emerald"
        >
          The countdown begins
        </motion.p>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-end">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-8">
            {units(parts).map((u, i) => (
              <motion.div
                key={u.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.08, ease }}
                className="border-t border-white/15 pt-4"
              >
                <dd className="numeral text-6xl leading-none text-white sm:text-7xl xl:text-8xl">
                  {pad(u.value)}
                </dd>
                <dt className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-white/50">
                  {u.label}
                </dt>
              </motion.div>
            ))}
          </dl>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.2, ease }}
            className="lg:col-span-4"
          >
            <h2 className="display-md text-white">{conference.strapline}</h2>
            <p className="mt-4 text-sm text-white/65">
              {conference.dates} · {conference.venue}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
