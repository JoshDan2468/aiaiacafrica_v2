import { useReducedMotion } from "@/hooks/useReducedMotion";

const officialTheme = "SECURING ASSETS, EMPOWERING INTELLIGENCE, AUTOMATING THE FUTURE.";

function ThemeWords() {
  return (
    <>
      SECURING ASSETS, <span className="text-lime">EMPOWERING INTELLIGENCE</span>, AUTOMATING THE
      FUTURE.
    </>
  );
}

export function OfficialThemeSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="official-theme-title"
      className="overflow-hidden bg-[#020b07] py-20 text-bone sm:py-24 lg:py-32"
    >
      <div className="shell">
        <h2 id="official-theme-title" className="sr-only">
          {officialTheme}
        </h2>
      </div>
      {reducedMotion ? (
        <p className="shell mt-8 text-[clamp(3rem,8vw,8rem)] font-extrabold uppercase leading-[0.82] tracking-[-0.065em]">
          <ThemeWords />
        </p>
      ) : (
        <div className="theme-marquee mt-10" aria-label={officialTheme}>
          <div className="theme-marquee__track">
            <p className="theme-marquee__phrase">
              <ThemeWords />
            </p>
            <p className="theme-marquee__phrase" aria-hidden="true">
              <ThemeWords />
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
