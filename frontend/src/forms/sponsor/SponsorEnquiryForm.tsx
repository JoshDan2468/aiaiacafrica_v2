import { RegistrationFlowForm, type RegistrationField } from "@/forms/common/RegistrationFlowForm";
import { sponsorEnquirySchema } from "@/forms/sponsor/sponsorEnquirySchema";

const fields: RegistrationField[] = [
  { name: "fullName", label: "Contact person", required: true },
  { name: "email", label: "Work email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", required: true },
  { name: "jobTitle", label: "Job title", required: true },
  { name: "organisation", label: "Company / organisation", required: true },
  { name: "country", label: "Country", required: true },
];

export function SponsorEnquiryForm() {
  return (
    <RegistrationFlowForm
      flowLabel="sponsor enquiry"
      schema={sponsorEnquirySchema}
      fields={fields}
    />
  );
}
