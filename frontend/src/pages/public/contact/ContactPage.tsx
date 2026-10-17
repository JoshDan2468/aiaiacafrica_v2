import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { createBreadcrumbSchema } from "@/components/common/SEO";
import { HeroSection } from "./HeroSection";
import { ContactInfoSection } from "./ContactInfoSection";
import { ContactFormSection } from "./ContactFormSection";
import { WhatsAppSection } from "./WhatsAppSection";
import { OfficeLocationsSection } from "./OfficeLocationsSection";

export function ContactPage() {
  return (
    <PublicPageLayout
      title="Contact AIAIAC Africa 2027 | Official Event Communications"
      description="Contact the AIAIAC team regarding registration, sponsorship, exhibition, speaker participation, media enquiries or general event information."
      canonical="/contact"
      schema={createBreadcrumbSchema([
        { name: "Home", item: "/" },
        { name: "Contact", item: "/contact" },
      ])}
    >
      <HeroSection />
      <ContactInfoSection />
      <ContactFormSection />
      <WhatsAppSection />
      <OfficeLocationsSection />
    </PublicPageLayout>
  );
}
