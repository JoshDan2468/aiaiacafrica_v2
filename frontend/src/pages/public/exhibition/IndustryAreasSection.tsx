import { AnimatedSection } from "@/components/common/AnimatedSection";

const industryAreas = [
  {
    title: "Asset Integrity",
    description:
      "Structural health monitoring, asset lifecycle management, risk-based inspection (RBI) platforms, and fitness-for-service (FFS) engineering solutions.",
  },
  {
    title: "Inspection & NDT",
    description:
      "Advanced non-destructive testing, acoustic emission sensors, ultrasonic phased array equipment, radiographic scanners, and automated inspection robotics.",
  },
  {
    title: "Corrosion & Coatings",
    description:
      "Cathodic protection systems, specialized protective barrier coatings, corrosion inhibitors, chemical injection, and metallurgical testing services.",
  },
  {
    title: "Reliability & Maintenance",
    description:
      "Predictive and prescriptive maintenance regimes, vibration diagnostics, lubrication management, asset performance management, and turnaround planning software.",
  },
  {
    title: "Artificial Intelligence & Analytics",
    description:
      "Industrial machine learning models, predictive failure analytics, computer vision defect detection, neural network modeling, and digital twin platforms.",
  },
  {
    title: "Automation, Instrumentation & Control",
    description:
      "Distributed control systems (DCS), PLCs, SCADA infrastructure, smart field transmitters, emergency shutdown systems, and process instrumentation.",
  },
  {
    title: "OT & Industrial Cybersecurity",
    description:
      "Industrial control network security, IEC 62443 standard implementations, secure remote access, anomaly threat detection, and ICS incident mitigation.",
  },
  {
    title: "Subsea & Pipeline Integrity",
    description:
      "Intelligent inline inspection tools (smart PIGs), acoustic pipeline leak detection, subsea riser monitoring, and subsea robotics.",
  },
  {
    title: "Safety, Risk & Environmental Solutions",
    description:
      "Process safety management tools, toxic and flammable gas detection systems, environmental compliance monitoring, and hazardous area certified equipment.",
  },
];

export function IndustryAreasSection() {
  return (
    <section className="bg-[#E8EEE8] py-20 text-[#102C20] lg:py-24">
      <div className="shell max-w-[1280px]">
        <AnimatedSection className="max-w-3xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#102C20] sm:text-4xl lg:text-[42px]">
            Industry Areas
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#4A5D52] sm:text-[17px]">
            The AIAIAC Africa exhibition floor showcases hardware, software, and specialised
            engineering services across nine critical industrial domains.
          </p>
        </AnimatedSection>

        {/* 3-Column Editorial Grid (Pure typography, no cards, no lines, no numbers) */}
        <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-14 lg:gap-y-12">
          {industryAreas.map((area, index) => (
            <AnimatedSection key={area.title} delay={index * 0.03}>
              <div>
                <h3 className="font-display text-[19px] font-bold text-[#102C20] sm:text-[20px]">
                  {area.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-[#4A5D52] sm:text-[15.5px]">
                  {area.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
