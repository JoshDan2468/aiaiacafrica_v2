import { ArrowRight, Building2, GraduationCap, Presentation, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";

const participationRoutes = [
  {
    title: "Professional Delegate",
    description: "Join the technical conference, exhibition, and professional programme.",
    action: "Register as Professional",
    to: "/registration/delegate?type=professional",
    icon: Users,
  },
  {
    title: "Student Delegate",
    description:
      "Join the next generation of industry professionals. Academic verification is required.",
    action: "Apply as Student",
    to: "/registration/delegate?type=student",
    icon: GraduationCap,
  },
  {
    title: "Sponsor",
    description: "Build your presence through a conference sponsorship package.",
    action: "Become a Sponsor",
    to: "/registration/sponsor",
    icon: Building2,
  },
  {
    title: "Exhibitor",
    description: "Showcase your products, services and expertise to the industry.",
    action: "Apply to Exhibit",
    to: "/registration/exhibitor",
    icon: Presentation,
  },
] as const;

export function ParticipationChoiceSection() {
  return (
    <section
      id="participation-choice"
      className="bg-[#F5F2E9] py-14 text-[#102C20] sm:py-18 lg:py-20"
      aria-labelledby="participation-choice-title"
    >
      <div className="shell max-w-[1240px]">
        <AnimatedSection
          once
          className="border-b border-[#102C20]/15 pb-8 sm:flex sm:items-end sm:justify-between sm:gap-10"
        >
          <div className="max-w-3xl">
            <p className="eyebrow text-[#315744]">Registration routes</p>
            <h2
              id="participation-choice-title"
              className="font-display mt-4 text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]"
            >
              How would you like to participate?
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#3F5347] sm:text-[17px]">
              Choose the route that matches your participation in AIAIAC Africa 2027.
            </p>
          </div>
          <p className="mt-6 shrink-0 text-sm text-[#3F5347] sm:mt-0">
            Already registered?{" "}
            <Link
              className="font-bold text-[#173D2D] underline decoration-[#173D2D]/35 underline-offset-4 transition-colors hover:decoration-[#173D2D] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173D2D]"
              to="/registration/continue"
            >
              Access your registration
            </Link>
          </p>
        </AnimatedSection>

        <div className="border-t border-[#102C20]/15">
          {participationRoutes.map((route, index) => {
            const Icon = route.icon;
            return (
              <AnimatedSection
                key={route.title}
                delay={index * 0.04}
                once
                className="group grid gap-5 border-b border-[#102C20]/15 py-7 sm:grid-cols-[2.5rem_1fr] sm:gap-x-6 lg:grid-cols-[2.5rem_1fr_1.1fr_auto] lg:items-center lg:py-9"
              >
                <Icon className="size-6 text-[#315744]" strokeWidth={1.7} aria-hidden="true" />
                <h3 className="font-display text-2xl font-bold tracking-tight text-[#102C20]">
                  {route.title}
                </h3>
                <p className="max-w-md text-[15px] leading-relaxed text-[#3F5347] sm:col-start-2 lg:col-start-auto">
                  {route.description}
                </p>
                <Link
                  className="inline-flex min-h-12 w-fit items-center justify-center gap-3 border border-[#173D2D] px-5 text-sm font-bold text-[#173D2D] transition-colors hover:bg-[#173D2D] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173D2D] sm:col-start-2 lg:col-start-auto"
                  to={route.to}
                >
                  {route.action}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
