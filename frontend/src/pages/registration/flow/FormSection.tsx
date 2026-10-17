import { Link } from "react-router-dom";
import { DelegateRegistrationForm } from "@/forms/delegate/DelegateRegistrationForm";
import { ExhibitorEnquiryForm } from "@/forms/exhibitor/ExhibitorEnquiryForm";
import { SponsorEnquiryForm } from "@/forms/sponsor/SponsorEnquiryForm";
import type { RegistrationOption } from "@/types";

const formByIntent = {
  delegate: <DelegateRegistrationForm />,
  exhibitor: <ExhibitorEnquiryForm />,
  sponsor: <SponsorEnquiryForm />,
} satisfies Record<RegistrationOption["intent"], React.ReactNode>;

export function FormSection({ intent }: { intent: RegistrationOption["intent"] }) {
  return (
    <section className="on-navy border-t border-white/10 py-20 lg:py-28">
      <div className="shell grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Link
            to="/registration"
            className="inline-flex min-h-11 items-center font-mono text-[0.64rem] uppercase tracking-[0.18em] text-emerald hover:text-white"
          >
            ← All registration types
          </Link>
          <h2 className="display-md mt-8 text-white">Prepare your {intent} details</h2>
          <p className="mt-6 text-sm leading-relaxed text-white/58">
            Use this checklist to make sure the essential contact details are ready while the
            organiser confirms the 2027 participation process.
          </p>
          <p className="mt-6 border-l-2 border-emerald pl-4 text-xs leading-relaxed text-white/48">
            Online enquiries are not yet open. Nothing entered here is saved or sent, and no booking
            or payment is created.
          </p>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">{formByIntent[intent]}</div>
      </div>
    </section>
  );
}
