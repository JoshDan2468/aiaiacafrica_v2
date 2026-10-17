import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { registrationOptions } from "@/data/registration";
import { RegistrationSection } from "./RegistrationSection";

const title = "Register — AIAIAC West Africa 2026";
const description =
  "Register as a delegate, book an exhibition stand or enquire about sponsorship at AIAC West Africa 2026, 9–10 June, Lagos.";

export function RegisterPage() {
  const [intent, setIntent] = useState(registrationOptions[0]!.intent);

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = descriptionMeta?.content;

    document.title = title;
    if (descriptionMeta) descriptionMeta.content = description;

    return () => {
      document.title = previousTitle;
      if (descriptionMeta && previousDescription) descriptionMeta.content = previousDescription;
    };
  }, []);

  return (
    <>
      <SiteHeader />
      <RegistrationSection intent={intent} onIntentChange={setIntent} />
      <SiteFooter />
    </>
  );
}
