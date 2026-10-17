import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ActionLink } from "@/components/common/ActionButton";
import { activeEvent, activeEventNotice } from "@/data/event";
import { navigation } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const reducedMotion = useReducedMotion();
  const registrationActive = pathname === "/registration" || pathname.startsWith("/registration/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <motion.header
        initial={reducedMotion ? false : { y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={
          reducedMotion ? { duration: 0 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }
        }
        className={cn(
          "fixed inset-x-0 top-0 z-50 text-emerald transition-[background-color,border-color,backdrop-filter,box-shadow] duration-500",
          scrolled || open
            ? "border-b border-white/12 bg-mineral/68 shadow-[0_12px_40px_oklch(0.12_0.03_157/.2)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="shell flex h-20 items-center justify-between gap-3 xl:grid xl:h-24 xl:grid-cols-[minmax(13rem,1fr)_auto_minmax(13rem,1fr)] xl:gap-4">
          <NavLink
            to="/"
            end
            aria-label={`${activeEvent.name} home`}
            className="flex min-w-0 shrink-0 items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald sm:gap-3 xl:justify-self-start"
          >
            <img
              src="/brand/aiaiac_logo.png"
              alt=""
              width="1254"
              height="1254"
              loading="eager"
              decoding="async"
              className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12 xl:h-13 xl:w-13 2xl:h-14 2xl:w-14"
            />
            <img
              src="/brand/aiaiac_name.png"
              alt=""
              width="766"
              height="160"
              loading="eager"
              decoding="async"
              className="h-4.5 w-auto shrink-0 object-contain sm:h-6 xl:h-6.5 2xl:h-7"
            />
          </NavLink>

          <div className="hidden items-center justify-center gap-2 xl:flex 2xl:gap-4">
            <nav className="flex items-center gap-1 2xl:gap-2" aria-label="Primary">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    cn(
                      "link-underline inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-[0.58rem] font-semibold uppercase tracking-widest transition-colors 2xl:px-1.5 2xl:text-[0.62rem] 2xl:tracking-[0.12em]",
                      isActive ? "text-emerald" : "text-white/76 hover:text-white",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <ActionLink
              to="/registration"
              size="sm"
              current={registrationActive}
              className={cn(
                "h-10 px-3.5 text-[0.6rem] 2xl:h-11 2xl:px-5 2xl:text-xs",
                registrationActive && "bg-white",
              )}
            >
              Register
            </ActionLink>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 xl:hidden">
            <ActionLink
              to="/registration"
              size="sm"
              current={registrationActive}
              className={cn("hidden sm:inline-flex", registrationActive && "bg-white")}
            >
              Register
            </ActionLink>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 border border-white/28 rounded-lg transition-colors hover:border-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime xl:hidden"
            >
              <span
                className={cn(
                  "block h-0.5 w-5 bg-white transition-transform duration-300",
                  open && "translate-y-[4px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "block h-0.5 w-5 bg-white transition-transform duration-300",
                  open && "-translate-y-[4px] -rotate-45",
                )}
              />
            </button>
          </div>

          {/* <div className="hidden items-center justify-self-end gap-3 xl:flex">
            <div className="text-right leading-none">
              <p className="font-mono text-[0.5rem] font-semibold uppercase tracking-[0.18em] text-white/52">
                Organised by
              </p>
              <p className="mt-1 max-w-28 text-[0.58rem] font-semibold uppercase leading-[1.15] tracking-[0.08em] text-white/86">
                Global Experts Energy
              </p>
            </div>
            <div className=" ">
              <img
                src="/brand/G-expert-logo-invert.png"
                alt=""
                width="406"
                height="369"
                loading="eager"
                decoding="async"
                className="h-20 w-20 shrink-0 object-contain"
              />
            </div>
          </div> */}
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-navigation"
            initial={reducedMotion ? false : { clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={reducedMotion ? {} : { clipPath: "inset(0 0 100% 0)" }}
            transition={
              reducedMotion ? { duration: 0 } : { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
            }
            className="fixed inset-0 z-40 bg-mineral pt-20 xl:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Primary navigation"
          >
            <div className="grid-lines absolute inset-0 opacity-35" aria-hidden />
            <nav className="shell relative flex h-full flex-col justify-between overflow-y-auto pb-10">
              <ul className="mt-6 grid sm:grid-cols-2 sm:gap-x-10">
                {navigation.map((item, index) => (
                  <motion.li
                    key={item.to}
                    initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { delay: 0.08 + index * 0.045, duration: 0.5 }
                    }
                    className="border-b border-white/10"
                  >
                    <NavLink
                      to={item.to}
                      end
                      className={({ isActive }) =>
                        cn(
                          "flex min-h-16 items-center font-display text-2xl font-extrabold uppercase tracking-[-0.02em]",
                          isActive ? "text-emerald" : "text-white",
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  </motion.li>
                ))}
              </ul>
              <div className="space-y-5 pt-8">
                <p className="font-mono text-[0.65rem] uppercase leading-relaxed tracking-[0.18em] text-emerald">
                  {activeEvent.edition} · {activeEventNotice}
                </p>
                <ActionLink
                  to="/registration"
                  size="lg"
                  current={registrationActive}
                  className={cn("w-full", registrationActive && "bg-white")}
                >
                  Registration options
                </ActionLink>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
