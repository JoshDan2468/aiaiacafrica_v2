import { AnimatedSection } from "@/components/common/AnimatedSection";

const processSteps = [
  {
    title: "Choose Your Participation Type",
    description: "Select the option that best matches how you plan to participate.",
  },
  {
    title: "Provide Your Details",
    description: "Complete the relevant registration or enquiry information.",
  },
  {
    title: "Receive Confirmation",
    description:
      "The AIAIAC team will provide confirmation or next-step information where required.",
  },
  {
    title: "Prepare for the Conference",
    description:
      "Confirmed participants will receive relevant event information ahead of the conference.",
  },
];

export function ProcessSection() {
  return (
    <section
      id="what-happens-next"
      className="bg-[#FFFFFF] py-16 text-[#102C20] sm:py-20 lg:py-24 border-t border-[#EAEFEA]"
    >
      <div className="shell max-w-[1240px]">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]">
            What Happens Next
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#4A5D52] sm:text-[17px]">
            A clear, straightforward path from your initial enquiry or registration through to event
            participation.
          </p>
        </AnimatedSection>

        {/* 4 Clean Editorial Text Columns — No Cards, No Borders, No Numbers */}
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {processSteps.map((step, idx) => (
            <AnimatedSection key={step.title} delay={idx * 0.05} once>
              <div className="space-y-3">
                <h3 className="font-display text-[19px] font-bold tracking-tight text-[#102C20] sm:text-[20px]">
                  {step.title}
                </h3>
                <p className="text-[15.5px] leading-relaxed text-[#4A5D52]">{step.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
