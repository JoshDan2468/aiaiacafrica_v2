import { RegistrationFlowForm, type RegistrationField } from "@/forms/common/RegistrationFlowForm";
import { delegateRegistrationSchema } from "@/forms/delegate/delegateRegistrationSchema";

const fields: RegistrationField[] = [
  { name: "fullName", label: "Full name", required: true },
  { name: "email", label: "Work email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", required: true },
  { name: "jobTitle", label: "Job title", required: true },
  { name: "organisation", label: "Organisation", required: true },
  { name: "country", label: "Country", required: true },
];

export function DelegateRegistrationForm() {
  return (
    <RegistrationFlowForm
      flowLabel="delegate request"
      schema={delegateRegistrationSchema}
      fields={fields}
    />
  );
}
