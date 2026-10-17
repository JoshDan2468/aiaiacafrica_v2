import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";

export function RegistrationShortcutsSection() {
  return (
    <section
      id="registration-shortcuts"
      aria-labelledby="registration-shortcuts-title"
      className="bg-[#030e08] py-16 text-white sm:py-20 lg:py-24"
    >
      <div className="shell">
        <AnimatedSection className="grid gap-4 border-l-2 border-lime pl-4 sm:pl-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] lg:items-end">
          <div>
            <h2
              id="registration-shortcuts-title"
              className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              How Will You Participate?
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
            Join Africa's leading conference on asset integrity, artificial intelligence,
            automation, and cybersecurity.
          </p>
        </AnimatedSection>

        {/* 2 Primary Registration Cards */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:mt-12 lg:gap-8">
          {/* Card 1: Delegate Registration */}
          <AnimatedSection delay={0.05}>
            <Link
              to="/registration/delegate"
              className="group relative flex h-full min-h-[22rem] flex-col justify-between overflow-hidden rounded-3xl border border-lime/35 bg-gradient-to-br from-[#071F18] via-[#0C3526] to-[#124C38] p-8 text-white shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-lime/60 hover:shadow-2xl sm:p-10"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-lime/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-lime">
                  Delegate Pass
                </span>
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-lime text-[#05190F] transition-transform duration-300 group-hover:scale-110"
                >
                  ↗
                </span>
              </div>
              <div className="my-6">
                <h3 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Delegate Registration
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                  Join the technical exchange, specialist sessions, and peer conversations shaping
                  resilient asset-intensive operations across West Africa.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-lime px-6 py-3 font-sans text-sm font-bold text-[#05190F] transition-all duration-300 group-hover:bg-white">
                <span>Register as Delegate</span>
                <span>→</span>
              </div>
            </Link>
          </AnimatedSection>

          {/* Card 2: Sponsorship Opportunities */}
          <AnimatedSection delay={0.1}>
            <Link
              to="/registration/sponsor"
              className="group relative flex h-full min-h-[22rem] flex-col justify-between overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-[#05190F] via-[#082819] to-[#0E3D27] p-8 text-white shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/40 hover:shadow-2xl sm:p-10"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/90">
                  Sponsorship & Exhibition
                </span>
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-transform duration-300 group-hover:scale-110"
                >
                  ↗
                </span>
              </div>
              <div className="my-6">
                <h3 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Sponsorship Opportunities
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                  Position your brand, executive leadership, and technology solutions directly in
                  front of regional decision-makers and asset owners.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-sans text-sm font-bold text-white backdrop-blur-xs transition-all duration-300 group-hover:bg-white group-hover:text-[#05190F]">
                <span>Explore Sponsorship Opportunities</span>
                <span>→</span>
              </div>
            </Link>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
