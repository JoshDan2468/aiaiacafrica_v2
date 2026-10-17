import { RegistrationFlowForm, type RegistrationField } from "@/forms/common/RegistrationFlowForm";
import { exhibitorEnquirySchema } from "@/forms/exhibitor/exhibitorEnquirySchema";

const fields: RegistrationField[] = [
  { name: "fullName", label: "Contact person", required: true },
  { name: "email", label: "Work email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", required: true },
  { name: "organisation", label: "Company / organisation", required: true },
  { name: "country", label: "Country", required: true },
];

export function ExhibitorEnquiryForm() {
  return (
    <RegistrationFlowForm
      flowLabel="exhibitor enquiry"
      schema={exhibitorEnquirySchema}
      fields={fields}
    />
  );
}
