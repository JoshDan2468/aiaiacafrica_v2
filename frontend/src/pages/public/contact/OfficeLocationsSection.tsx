import { AnimatedSection } from "@/components/common/AnimatedSection";

const offices = [
  {
    city: "Lagos, Nigeria",
    address: "31 Ademola Street off Awolowo Road,\nIkoyi, Lagos",
  },
  {
    city: "Abuja, Nigeria",
    address: "Plot 3031 Mariam Ikejiani Clark Crescent,\nAsokoro, Abuja",
  },
  {
    city: "Richmond, Texas, USA",
    address: "77406, Richmond, Texas, USA",
  },
];

export function OfficeLocationsSection() {
  return (
    <section className="bg-[#F5F2E9] py-14 text-[#102C20] sm:py-16 lg:py-20">
      <div className="shell max-w-[1240px]">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl">
            Office Locations
          </h2>
        </AnimatedSection>

        {/* Clean 3-Column Layout */}
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {offices.map((office, idx) => (
            <AnimatedSection key={office.city} delay={idx * 0.05} once>
              <div className="rounded-[16px] border border-[#D8DDD5] bg-[#FFFFFF] p-7 shadow-xs">
                <h3 className="font-display text-[18px] font-bold tracking-tight text-[#102C20] sm:text-[19px]">
                  {office.city}
                </h3>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[#4A5D52]">
                  {office.address}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
