import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { registrationOptions } from "@/data/registration";
import type { RegistrationOption } from "@/types";
import { FormSection } from "./FormSection";
import { HeroSection } from "./HeroSection";

export function RegistrationFlowPage({ intent }: { intent: RegistrationOption["intent"] }) {
  const option = registrationOptions.find((item) => item.intent === intent)!;

  return (
    <PublicPageLayout
      title={`${option.title} | AIAIAC Africa 2027`}
      description={`${option.title} contact flow for AIAIAC Africa 2027.`}
    >
      <HeroSection option={option} />
      <FormSection intent={intent} />
    </PublicPageLayout>
  );
}
