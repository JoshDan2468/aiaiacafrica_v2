import { AnimatedSection } from "@/components/common/AnimatedSection";

const audienceProfiles = [
  {
    title: "Asset Owners & Operators",
    description:
      "Upstream operators, refinery superintendents, power plant managers, and pipeline network operators evaluating facility life extension and operational integrity.",
  },
  {
    title: "EPC Contractors & Project Directors",
    description:
      "Engineering, procurement, and construction leaders sourcing pre-qualified subcontractors, equipment packages, and specialised industrial solutions.",
  },
  {
    title: "Technical Directors & Chief Engineers",
    description:
      "Chief technology officers, heads of engineering, and chief integrity officers defining engineering standards, equipment specifications, and technology adoption.",
  },
  {
    title: "Maintenance & Inspection Managers",
    description:
      "Practicing maintenance superintendents, inspection coordinators, and turnaround planners actively procuring diagnostic tools and maintenance services.",
  },
  {
    title: "AI & Digital Transformation Leads",
    description:
      "Enterprise digital leaders, predictive analytics architects, and automation directors deploying machine learning and digital twin capabilities.",
  },
  {
    title: "Cybersecurity & OT Specialists",
    description:
      "Industrial control network security leads, SCADA engineers, and operational technology risk officers safeguarding critical industrial infrastructure.",
  },
  {
    title: "Regulators & Government Agencies",
    description:
      "Energy regulatory authorities, petroleum commissions, standards organisations, and safety inspectors enforcing statutory compliance and operating benchmarks.",
  },
  {
    title: "Procurement & Supply Chain Executives",
    description:
      "Commercial procurement directors, vendor management executives, and contract managers overseeing active vendor databases and major contract tenders.",
  },
];

export function AudienceSection() {
  return (
    <section className="bg-[#071C13] py-20 text-[#F7F5EF] lg:py-24">
      <div className="shell max-w-[1280px]">
        <AnimatedSection className="max-w-3xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#F7F5EF] sm:text-4xl lg:text-[44px]">
            Who You Can Connect With
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#BCC8C0] sm:text-[17px]">
            AIAIAC Africa convenes qualified technical, operational, and commercial leadership who
            evaluate, specify, and procure industrial systems across the regional energy value
            chain.
          </p>
        </AnimatedSection>

        {/* 4-Column Typographic Layout with High Contrast and Zero Fading */}
        <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {audienceProfiles.map((profile, index) => (
            <AnimatedSection key={profile.title} delay={index * 0.04}>
              <div>
                <h3 className="font-display text-[19px] font-bold text-[#F7F5EF] sm:text-[20px]">
                  {profile.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-[#BCC8C0] sm:text-[15.5px]">
                  {profile.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
