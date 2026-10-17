import { AnimatedSection } from "@/components/common/AnimatedSection";
import assetIntegrityImage from "@/data/AIAC_images/image30.jpg";
import artificialIntelligenceImage from "@/data/AIAC_images/image16.jpg";
import automationImage from "@/data/AIAC_images/image27.jpg";
import cybersecurityImage from "@/data/AIAC_images/image20.jpg";

export function TechnicalConferencesSection() {
  return (
    <section id="conferences" className="w-full">
      {/* 1. SECTION INTRO + BLOCK 1: ASSET INTEGRITY (Warm Ivory #F5F2E9) */}
      <div className="bg-[#F5F2E9] py-28 text-[#102C20] sm:py-32 lg:py-36">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
          {/* Main Section Header with Generous Breathing Room */}
          <AnimatedSection className="max-w-[720px]">
            <h2 className="font-display text-[36px] font-extrabold uppercase tracking-tight text-[#102C20] sm:text-[44px] lg:text-[48px] xl:text-[50px]">
              Four Technical Conferences
            </h2>
            <p className="mt-5 text-base leading-[1.65] text-[#4A5850] sm:text-[17px]">
              The AIAIAC Africa 2027 technical programme is organised around four interconnected
              engineering disciplines that directly govern asset lifecycle integrity, operational
              efficiency, and digital security across heavy industrial facilities.
            </p>
          </AnimatedSection>

          {/* Block 1: Asset Integrity — Content Left (~54%) / Major Photo Right (~46%) */}
          <div className="mt-20 grid gap-12 lg:mt-24 lg:grid-cols-12 lg:items-center lg:gap-14 xl:gap-18">
            <AnimatedSection className="lg:col-span-7">
              <h3 className="font-display text-[30px] font-bold tracking-tight text-[#102C20] sm:text-[34px] lg:text-[38px] xl:text-[40px]">
                Asset Integrity
              </h3>
              <p className="mt-5 text-base leading-[1.68] text-[#4A5850] sm:text-[16.5px] lg:text-[17px]">
                Dedicated to maintaining operational reliability, preventing catastrophic failures,
                and optimizing lifecycle performance for pipelines, offshore structures, processing
                units, and mechanical equipment.
              </p>
              <div className="mt-7 space-y-2.5 text-[15.5px] leading-[1.6] text-[#2D5443] sm:text-[16.5px]">
                <p>
                  • Non-destructive testing (NDT), structural health monitoring, and remote
                  inspection
                </p>
                <p>
                  • Corrosion management, cathodic protection, and advanced coating technologies
                </p>
                <p>• Risk-based inspection (RBI) and fitness-for-service (FFS) assessments</p>
                <p>• Ageing infrastructure life extension and mechanical integrity auditing</p>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.08} className="lg:col-span-5">
              <div className="overflow-hidden rounded-[10px] bg-[#EBE6DC] shadow-xl sm:rounded-[12px]">
                <img
                  src={assetIntegrityImage}
                  alt="Asset integrity engineering panel at AIAIAC Africa"
                  width={1200}
                  height={800}
                  loading="eager"
                  decoding="async"
                  className="h-[360px] w-full object-cover sm:h-[400px] lg:h-[440px] xl:h-[480px]"
                />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>

      {/* 2. BLOCK 2: ARTIFICIAL INTELLIGENCE (Clean White #FFFFFF) */}
      <div className="bg-[#FFFFFF] py-28 text-[#102C20] sm:py-32 lg:py-36">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
          {/* Major Photo Left (~46%) / Content Right (~54%) */}
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14 xl:gap-18">
            <AnimatedSection delay={0.08} className="order-2 lg:order-1 lg:col-span-5">
              <div className="overflow-hidden rounded-[10px] bg-[#F5F2E9] shadow-xl sm:rounded-[12px]">
                <img
                  src={artificialIntelligenceImage}
                  alt="Industrial AI and data intelligence presentations at AIAIAC Africa"
                  width={1200}
                  height={800}
                  loading="eager"
                  decoding="async"
                  className="h-[360px] w-full object-cover sm:h-[400px] lg:h-[440px] xl:h-[480px]"
                />
              </div>
            </AnimatedSection>

            <AnimatedSection className="order-1 lg:order-2 lg:col-span-7">
              <h3 className="font-display text-[30px] font-bold tracking-tight text-[#102C20] sm:text-[34px] lg:text-[38px] xl:text-[40px]">
                Artificial Intelligence
              </h3>
              <p className="mt-5 text-base leading-[1.68] text-[#4A5850] sm:text-[16.5px] lg:text-[17px]">
                Investigating practical machine learning deployments, physics-informed neural
                networks, and automated diagnostic architectures embedded directly within active
                energy and processing operations.
              </p>
              <div className="mt-7 space-y-2.5 text-[15.5px] leading-[1.6] text-[#2D5443] sm:text-[16.5px]">
                <p>• Predictive maintenance models and remaining useful life (RUL) estimation</p>
                <p>• Computer vision for autonomous visual and thermal inspection analysis</p>
                <p>• Industrial digital twins and real-time operational simulation</p>
                <p>
                  • AI governance, data reliability, and model interpretability in mission-critical
                  environments
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>

      {/* 3. BLOCK 3: AUTOMATION (Soft Sage #E5EBE5) */}
      <div className="bg-[#E5EBE5] py-28 text-[#102C20] sm:py-32 lg:py-36">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
          {/* Content Left (~54%) / Major Photo Right (~46%) */}
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14 xl:gap-18">
            <AnimatedSection className="lg:col-span-7">
              <h3 className="font-display text-[30px] font-bold tracking-tight text-[#102C20] sm:text-[34px] lg:text-[38px] xl:text-[40px]">
                Automation
              </h3>
              <p className="mt-5 text-base leading-[1.68] text-[#4A5850] sm:text-[16.5px] lg:text-[17px]">
                Covering modern distributed control systems, autonomous inspection robotics, smart
                field instrumentation, and process optimization frameworks that maximize facility
                throughput and worker safety.
              </p>
              <div className="mt-7 space-y-2.5 text-[15.5px] leading-[1.6] text-[#2D5443] sm:text-[16.5px]">
                <p>• Distributed control systems (DCS) and programmable logic controllers (PLC)</p>
                <p>
                  • Unmanned aerial vehicles (UAVs) and robotic crawlers for hazardous space
                  inspection
                </p>
                <p>• Edge telemetry, industrial IoT sensors, and high-frequency data ingestion</p>
                <p>
                  • Remote operations centres (ROC) and autonomous facility control methodologies
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.08} className="lg:col-span-5">
              <div className="overflow-hidden rounded-[10px] bg-[#D6DFD6] shadow-xl sm:rounded-[12px]">
                <img
                  src={automationImage}
                  alt="Industrial automation and control systems exhibition showcase"
                  width={1200}
                  height={800}
                  loading="eager"
                  decoding="async"
                  className="h-[360px] w-full object-cover sm:h-[400px] lg:h-[440px] xl:h-[480px]"
                />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>

      {/* 4. BLOCK 4: CYBERSECURITY (Soft Ivory #FAF8F2) */}
      <div className="bg-[#FAF8F2] py-28 text-[#102C20] sm:py-32 lg:py-36">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
          {/* Major Photo Left (~46%) / Content Right (~54%) */}
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14 xl:gap-18">
            <AnimatedSection delay={0.08} className="order-2 lg:order-1 lg:col-span-5">
              <div className="overflow-hidden rounded-[10px] bg-[#EBE6DC] shadow-xl sm:rounded-[12px]">
                <img
                  src={cybersecurityImage}
                  alt="Industrial cybersecurity and operational technology defense discussion"
                  width={1200}
                  height={800}
                  loading="eager"
                  decoding="async"
                  className="h-[360px] w-full object-cover sm:h-[400px] lg:h-[440px] xl:h-[480px]"
                />
              </div>
            </AnimatedSection>

            <AnimatedSection className="order-1 lg:order-2 lg:col-span-7">
              <h3 className="font-display text-[30px] font-bold tracking-tight text-[#102C20] sm:text-[34px] lg:text-[38px] xl:text-[40px]">
                Cybersecurity
              </h3>
              <p className="mt-5 text-base leading-[1.68] text-[#4A5850] sm:text-[16.5px] lg:text-[17px]">
                Addressing defensive architectures, incident detection, operational network
                isolation, and regulatory compliance required to shield critical industrial assets
                and SCADA infrastructures against digital threats.
              </p>
              <div className="mt-7 space-y-2.5 text-[15.5px] leading-[1.6] text-[#2D5443] sm:text-[16.5px]">
                <p>
                  • Operational technology (OT) network segmentation and Zero Trust architectures
                </p>
                <p>• SCADA and safety instrumented systems (SIS) security hardening</p>
                <p>• Industrial incident response, forensics, and operational resilience</p>
                <p>• Compliance with IEC 62443, NIST guidelines, and regional energy mandates</p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
