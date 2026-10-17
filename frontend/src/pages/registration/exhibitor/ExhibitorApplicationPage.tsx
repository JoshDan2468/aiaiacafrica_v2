import { useState } from "react";
import { Link } from "react-router-dom";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { CommercialApplicationForm } from "@/forms/commercial/CommercialApplicationForm";
import {
  exhibitorApplicationSchema,
  type ExhibitorApplicationValues,
} from "@/forms/commercial/commercialApplicationSchemas";
import { exhibitionStandPackages } from "@/data/brochure";
import {
  submitExhibitorApplication,
  type CommercialApplicationConfirmation as Confirmation,
} from "@/services/commercialApplication/commercialApplicationService";
import { CommercialApplicationConfirmation } from "../commercial/CommercialApplicationConfirmation";

const packages = exhibitionStandPackages.map((item) => ({
  code: item.code!,
  title: item.title,
  priceLabel: item.priceLabel!,
}));

export function ExhibitorApplicationPage() {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  return (
    <PublicPageLayout
      title="Exhibitor Application | AIAIAC Africa 2027"
      description="Apply for an approved AIAIAC 2027 exhibition stand."
      canonical="/registration/exhibitor"
    >
      <div aria-hidden="true" className="h-20 bg-[#05190F] xl:h-24" />
      <section className="bg-[#F7F5EF] py-16 sm:py-24">
        <div className="shell max-w-4xl">
          <Link
            to="/registration"
            className="mb-8 inline-flex min-h-11 items-center text-sm font-semibold text-forest underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            All registration categories
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">AIAIAC 2027</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-mineral sm:text-5xl">
            Exhibitor application
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Choose an exhibition stand and tell us about your organisation. Our team will review
            your application and contact you about availability. No payment is required here.
          </p>
          <div className="mt-10 border-t-2 border-forest bg-white p-5 sm:p-10">
            {confirmation ? (
              <CommercialApplicationConfirmation confirmation={confirmation} />
            ) : (
              <CommercialApplicationForm
                kind="Exhibitor"
                packages={packages}
                validate={(value) => exhibitorApplicationSchema.safeParse(value)}
                submit={(value) => submitExhibitorApplication(value as ExhibitorApplicationValues)}
                onSubmitted={setConfirmation}
              />
            )}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
