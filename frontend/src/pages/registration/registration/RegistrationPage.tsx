import { useState } from "react";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { createBreadcrumbSchema } from "@/components/common/SEO";
import { HeroSection } from "./HeroSection";
import { ParticipationChoiceSection } from "./ParticipationChoiceSection";
import { ContributeProgrammeSection } from "./ContributeProgrammeSection";
import { DynamicParticipationFormSection } from "./DynamicParticipationFormSection";
import { type ParticipationType } from "./types";
import { ProcessSection } from "./ProcessSection";
import { NeedHelpSection } from "./NeedHelpSection";

export function RegistrationPage() {
  const [selectedParticipationType, setSelectedParticipationType] = useState<ParticipationType>(
    "General Participation Enquiry",
  );

  const handleSelectParticipationType = (type: string) => {
    setSelectedParticipationType(type as ParticipationType);
    const enquiries = document.getElementById("registration-enquiries");
    if (enquiries instanceof HTMLDetailsElement) enquiries.open = true;
    const formElement = document.getElementById("enquiry-form");
    if (formElement) {
      formElement.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    }
  };

  return (
    <PublicPageLayout
      title="Participate in AIAIAC Africa 2027 | Registration & Commercial Enquiries"
      description="Choose how you would like to participate in AIAIAC Africa 2027. Access delegate registration, sponsorship packages, exhibition spaces, and technical abstract submissions."
      canonical="/registration"
      schema={createBreadcrumbSchema([
        { name: "Home", item: "/" },
        { name: "Registration", item: "/registration" },
      ])}
    >
      {/* 1. DARK / EDITORIAL HERO (#05190F) */}
      <HeroSection />

      {/* 2. WARM IVORY (#F5F2E9) — Participation choice */}
      <ParticipationChoiceSection />

      <details className="bg-white" id="registration-enquiries">
        <summary className="shell cursor-pointer border-b border-mineral/15 py-8 font-display text-xl font-bold text-mineral focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest">
          Programme submissions and general enquiries
          <span className="mt-2 block font-sans text-sm font-normal text-slate-600">
            Abstracts, media enquiries and help choosing how to participate.
          </span>
        </summary>
        {/* 3. WARM IVORY (#F5F2E9) — Contribute to the Programme */}
        <ContributeProgrammeSection onSelectEnquiryType={handleSelectParticipationType} />

        {/* 4. WHITE (#FFFFFF) — Dynamic Participation Enquiry Form */}
        <DynamicParticipationFormSection
          selectedType={selectedParticipationType}
          onSelectType={setSelectedParticipationType}
        />
      </details>

      {/* 5. WHITE (#FFFFFF) — What Happens Next */}
      <ProcessSection />

      {/* 6. DARK GREEN (#05190F) — Need Help Choosing? */}
      <NeedHelpSection />
    </PublicPageLayout>
  );
}
