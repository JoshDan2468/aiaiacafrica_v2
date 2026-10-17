import { AnimatedSection } from "@/components/common/AnimatedSection";

const topicCategories = [
  {
    discipline: "Asset Integrity",
    topics: [
      "Non-Destructive Testing (NDT) & Advanced Inspection",
      "Corrosion Management & Cathodic Protection",
      "Reliability Engineering & Asset Performance",
      "Maintenance Strategy & Plant Turnarounds",
      "Pipeline Integrity & Subsea Monitoring",
      "Fitness-for-Service (FFS) & Life Extension",
    ],
  },
  {
    discipline: "Artificial Intelligence",
    topics: [
      "Applied Industrial Machine Learning",
      "Predictive Maintenance & Degradation Models",
      "Industrial Digital Twins & Simulation",
      "Data-Driven Operational Analytics",
      "Autonomous Visual & Thermal Inspection",
      "AI Governance & Safety-Critical Verification",
    ],
  },
  {
    discipline: "Automation",
    topics: [
      "Smart Instrumentation & Field Sensing",
      "Process Control Systems (DCS / PLC)",
      "Industrial Robotics & Inspection Crawlers",
      "SCADA Modernization & Edge Ingestion",
      "Operational Workflow Optimization",
      "Autonomous Systems & Remote Monitoring",
    ],
  },
  {
    discipline: "Cybersecurity",
    topics: [
      "Operational Technology (OT) Network Defense",
      "Critical Infrastructure Cyber Protection",
      "Cyber Risk Management & Threat Intelligence",
      "Industrial Digital Resilience Architectures",
      "Safety Instrumented Systems (SIS) Isolation",
      "IEC 62443 Compliance & Governance",
    ],
  },
];

export function TechnicalTopicsSection() {
  return (
    <section className="bg-[#FFFFFF] py-28 text-[#102C20] sm:py-32 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <AnimatedSection className="max-w-3xl">
          <h2 className="font-display text-[36px] font-extrabold uppercase tracking-tight text-[#102C20] sm:text-[42px] lg:text-[46px]">
            Technical Topics
          </h2>
          <p className="mt-4 text-base leading-[1.6] text-[#4A5850] sm:text-[16.5px]">
            Comprehensive subject matter addressed across technical presentations, specialised
            breakout sessions, and peer-reviewed case studies.
          </p>
        </AnimatedSection>

        {/* 4 Editorial Columns: Large desktop 4 cols, Tablet 2 cols, Mobile 1 col. NO lines, NO cards, NO pills */}
        <div className="mt-16 grid gap-x-12 gap-y-12 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-14">
          {topicCategories.map((category, index) => (
            <AnimatedSection key={category.discipline} delay={index * 0.04} className="space-y-5">
              <h3 className="text-[19px] font-semibold text-[#102C20] sm:text-[20px] lg:text-[21px]">
                {category.discipline}
              </h3>
              <ul className="space-y-3.5 text-[15px] leading-[1.6] text-[#55635B] sm:text-[16px]">
                {category.topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
