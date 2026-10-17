import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Check, Mail, MessageSquare } from "lucide-react";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { EVENT_CONTACT_CONFIG } from "@/data/eventContactConfig";
import { participationTypes, type ParticipationType } from "./types";

export type { ParticipationType };

const standSizes = ["9 sqm", "18 sqm", "36 sqm", "Not Sure Yet"] as const;
const corporateGroupSizes = ["5–10 delegates", "11–25 delegates", "25+ delegates"] as const;

const participationFormSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name."),
  workEmail: z.string().trim().email("Please enter a valid work email address."),
  phoneNumber: z.string().trim().optional(),
  organisation: z.string().trim().min(2, "Please enter your organisation name."),
  jobTitle: z.string().trim().optional(),
  country: z.string().trim().optional(),
  participationType: z.enum(participationTypes),
  standSizeInterest: z.string().optional(),
  corporateGroupSize: z.string().optional(),
  message: z.string().trim().min(10, "Please provide details regarding your enquiry."),
});

export type ParticipationFormValues = z.infer<typeof participationFormSchema>;

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs font-semibold text-[#B91C1C]">
      {message}
    </p>
  );
}

interface DynamicParticipationFormSectionProps {
  selectedType: ParticipationType;
  onSelectType: (type: ParticipationType) => void;
}

export function DynamicParticipationFormSection({
  selectedType,
  onSelectType,
}: DynamicParticipationFormSectionProps) {
  const [preparedMailto, setPreparedMailto] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ParticipationFormValues>({
    resolver: zodResolver(participationFormSchema),
    defaultValues: {
      fullName: "",
      workEmail: "",
      phoneNumber: "",
      organisation: "",
      jobTitle: "",
      country: "",
      participationType: selectedType || "General Participation Enquiry",
      standSizeInterest: "",
      corporateGroupSize: "",
      message: "",
    },
  });

  const activeParticipationType = watch("participationType");

  useEffect(() => {
    if (selectedType && selectedType !== activeParticipationType) {
      setValue("participationType", selectedType);
    }
  }, [selectedType, setValue, activeParticipationType]);

  const handleTypeChange = (newType: ParticipationType) => {
    setValue("participationType", newType);
    onSelectType(newType);
  };

  const isExhibition = activeParticipationType === "Exhibition";
  const isCorporate = activeParticipationType === "Corporate Participation";

  const isCommercialRoute =
    activeParticipationType === "Sponsorship" ||
    activeParticipationType === "Exhibition" ||
    activeParticipationType === "Corporate Participation";

  const contextualWhatsappUrl = `https://wa.me/${EVENT_CONTACT_CONFIG.phoneRaw}?text=${encodeURIComponent(
    `Hello AIAIAC Africa team. I have submitted an enquiry regarding ${activeParticipationType} for AIAIAC Africa 2027 and would like to connect with a coordinator.`,
  )}`;

  const onSubmit = (values: ParticipationFormValues) => {
    const subject = `[AIAIAC 2027] ${values.participationType} - ${values.organisation} (${values.fullName})`;
    const bodyLines = [
      `Enquiry Type: ${values.participationType}`,
      `Full Name: ${values.fullName}`,
      `Work Email: ${values.workEmail}`,
      `Phone Number: ${values.phoneNumber || "Not provided"}`,
      `Organisation: ${values.organisation}`,
      `Job Title: ${values.jobTitle || "Not provided"}`,
      `Country: ${values.country || "Not provided"}`,
    ];

    if (values.participationType === "Exhibition" && values.standSizeInterest) {
      bodyLines.push(`Stand Size Interest: ${values.standSizeInterest}`);
    }
    if (values.participationType === "Corporate Participation" && values.corporateGroupSize) {
      bodyLines.push(`Approximate Group Size: ${values.corporateGroupSize}`);
    }

    bodyLines.push("", "Message / Details:", values.message);

    const mailto = `mailto:${EVENT_CONTACT_CONFIG.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    setPreparedMailto(mailto);
    window.location.href = mailto;
  };

  return (
    <section id="enquiry-form" className="bg-[#FFFFFF] py-16 text-[#102C20] sm:py-20 lg:py-24">
      <div className="shell max-w-[1240px]">
        {/* Section Heading */}
        <AnimatedSection once className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]">
            Participation Enquiry
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#4A5D52] sm:text-[17px]">
            Please complete the form below. All required fields are marked with an asterisk (*). We
            will prepare an email draft for you to review and send to the event team.
          </p>
        </AnimatedSection>

        {/* Single Strong Form Container — Max Width ~920px */}
        <AnimatedSection delay={0.05} once className="mx-auto mt-12 max-w-[920px]">
          <div className="rounded-[20px] border border-[#DCE4DC] bg-[#FFFFFF] p-8 sm:p-10 lg:p-12 shadow-xs">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              {/* Enquiry Type Selector at the Top */}
              <div>
                <label
                  htmlFor="part-type"
                  className="block text-[14.5px] font-bold text-[#102C20] sm:text-[15px]"
                >
                  Enquiry Type <span className="text-[#B91C1C]">*</span>
                </label>
                <select
                  id="part-type"
                  {...register("participationType")}
                  onChange={(e) => handleTypeChange(e.target.value as ParticipationType)}
                  className="mt-2 block w-full rounded-[12px] border border-[#CBD5E1] bg-white px-4 py-3.5 text-[15px] font-medium text-[#102C20] transition-colors focus:border-[#173D2D] focus:outline-none focus:ring-1 focus:ring-[#173D2D]"
                >
                  {participationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <FieldError id="part-type-error" message={errors.participationType?.message} />
              </div>

              {/* 2-Column Grid: Full Name & Work Email */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="part-fullname"
                    className="block text-[14.5px] font-bold text-[#102C20] sm:text-[15px]"
                  >
                    Full Name <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    id="part-fullname"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Amina Okafor"
                    {...register("fullName")}
                    className="mt-2 block w-full rounded-[12px] border border-[#CBD5E1] bg-white px-4 py-3.5 text-[15px] text-[#102C20] placeholder:text-[#94A3B8] transition-colors focus:border-[#173D2D] focus:outline-none focus:ring-1 focus:ring-[#173D2D]"
                    aria-describedby={errors.fullName ? "part-fullname-error" : undefined}
                  />
                  <FieldError id="part-fullname-error" message={errors.fullName?.message} />
                </div>

                <div>
                  <label
                    htmlFor="part-email"
                    className="block text-[14.5px] font-bold text-[#102C20] sm:text-[15px]"
                  >
                    Work Email <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    id="part-email"
                    type="email"
                    autoComplete="email"
                    placeholder="e.g. amina@organisation.com"
                    {...register("workEmail")}
                    className="mt-2 block w-full rounded-[12px] border border-[#CBD5E1] bg-white px-4 py-3.5 text-[15px] text-[#102C20] placeholder:text-[#94A3B8] transition-colors focus:border-[#173D2D] focus:outline-none focus:ring-1 focus:ring-[#173D2D]"
                    aria-describedby={errors.workEmail ? "part-email-error" : undefined}
                  />
                  <FieldError id="part-email-error" message={errors.workEmail?.message} />
                </div>
              </div>

              {/* 2-Column Grid: Phone Number & Organisation */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="part-phone"
                    className="block text-[14.5px] font-bold text-[#102C20] sm:text-[15px]"
                  >
                    Phone Number
                  </label>
                  <input
                    id="part-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="e.g. +234 801 234 5678"
                    {...register("phoneNumber")}
                    className="mt-2 block w-full rounded-[12px] border border-[#CBD5E1] bg-white px-4 py-3.5 text-[15px] text-[#102C20] placeholder:text-[#94A3B8] transition-colors focus:border-[#173D2D] focus:outline-none focus:ring-1 focus:ring-[#173D2D]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="part-organisation"
                    className="block text-[14.5px] font-bold text-[#102C20] sm:text-[15px]"
                  >
                    Organisation <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    id="part-organisation"
                    type="text"
                    autoComplete="organization"
                    placeholder="e.g. West Africa Energy Ltd"
                    {...register("organisation")}
                    className="mt-2 block w-full rounded-[12px] border border-[#CBD5E1] bg-white px-4 py-3.5 text-[15px] text-[#102C20] placeholder:text-[#94A3B8] transition-colors focus:border-[#173D2D] focus:outline-none focus:ring-1 focus:ring-[#173D2D]"
                    aria-describedby={errors.organisation ? "part-organisation-error" : undefined}
                  />
                  <FieldError id="part-organisation-error" message={errors.organisation?.message} />
                </div>
              </div>

              {/* 2-Column Grid: Job Title & Country */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="part-jobtitle"
                    className="block text-[14.5px] font-bold text-[#102C20] sm:text-[15px]"
                  >
                    Job Title
                  </label>
                  <input
                    id="part-jobtitle"
                    type="text"
                    autoComplete="organization-title"
                    placeholder="e.g. Head of Asset Integrity"
                    {...register("jobTitle")}
                    className="mt-2 block w-full rounded-[12px] border border-[#CBD5E1] bg-white px-4 py-3.5 text-[15px] text-[#102C20] placeholder:text-[#94A3B8] transition-colors focus:border-[#173D2D] focus:outline-none focus:ring-1 focus:ring-[#173D2D]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="part-country"
                    className="block text-[14.5px] font-bold text-[#102C20] sm:text-[15px]"
                  >
                    Country
                  </label>
                  <input
                    id="part-country"
                    type="text"
                    autoComplete="country-name"
                    placeholder="e.g. Nigeria, Ghana, United Kingdom"
                    {...register("country")}
                    className="mt-2 block w-full rounded-[12px] border border-[#CBD5E1] bg-white px-4 py-3.5 text-[15px] text-[#102C20] placeholder:text-[#94A3B8] transition-colors focus:border-[#173D2D] focus:outline-none focus:ring-1 focus:ring-[#173D2D]"
                  />
                </div>
              </div>

              {/* Dynamic Exhibition Field: Stand Size Interest */}
              {isExhibition && (
                <div>
                  <label
                    htmlFor="part-standsize"
                    className="block text-[14.5px] font-bold text-[#102C20] sm:text-[15px]"
                  >
                    Optional Stand Size Interest
                  </label>
                  <select
                    id="part-standsize"
                    {...register("standSizeInterest")}
                    className="mt-2 block w-full rounded-[12px] border border-[#CBD5E1] bg-white px-4 py-3.5 text-[15px] text-[#102C20] transition-colors focus:border-[#173D2D] focus:outline-none focus:ring-1 focus:ring-[#173D2D]"
                  >
                    <option value="">Select preferred stand configuration</option>
                    {standSizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Corporate Field: Delegate Group Size */}
              {isCorporate && (
                <div>
                  <label
                    htmlFor="part-groupsize"
                    className="block text-[14.5px] font-bold text-[#102C20] sm:text-[15px]"
                  >
                    Approximate Delegate Count
                  </label>
                  <select
                    id="part-groupsize"
                    {...register("corporateGroupSize")}
                    className="mt-2 block w-full rounded-[12px] border border-[#CBD5E1] bg-white px-4 py-3.5 text-[15px] text-[#102C20] transition-colors focus:border-[#173D2D] focus:outline-none focus:ring-1 focus:ring-[#173D2D]"
                  >
                    <option value="">Select approximate group size</option>
                    {corporateGroupSizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Message / Additional Information */}
              <div>
                <label
                  htmlFor="part-message"
                  className="block text-[14.5px] font-bold text-[#102C20] sm:text-[15px]"
                >
                  Message / Additional Information <span className="text-[#B91C1C]">*</span>
                </label>
                <textarea
                  id="part-message"
                  rows={4}
                  placeholder="Please specify your requirements, specific session tracks of interest, or questions..."
                  {...register("message")}
                  className="mt-2 block w-full rounded-[12px] border border-[#CBD5E1] bg-white px-4 py-3.5 text-[15px] text-[#102C20] placeholder:text-[#94A3B8] transition-colors focus:border-[#173D2D] focus:outline-none focus:ring-1 focus:ring-[#173D2D]"
                  aria-describedby={errors.message ? "part-message-error" : undefined}
                />
                <FieldError id="part-message-error" message={errors.message?.message} />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-[52px] items-center justify-center rounded-[14px] bg-[#CFEA3B] px-9 text-[15.5px] font-bold text-[#102C20] transition-colors hover:bg-[#bfe028] disabled:opacity-50"
                >
                  Continue to Email
                </button>
              </div>

              {/* Post-submission Transparent Confirmation */}
              {preparedMailto && (
                <div className="rounded-[14px] border border-[#173D2D]/20 bg-[#F4F8F4] p-5 text-[14.5px] text-[#1B382B]">
                  <div className="flex items-start gap-3">
                    <Check className="size-5 text-[#173D2D] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-[#102C20]">
                        Your enquiry draft has been prepared.
                      </p>
                      <p className="mt-1 text-[#3F5347]">
                        Your default email client has been opened with your pre-filled enquiry. If
                        it did not open automatically, you can use the direct link below:
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <a
                          href={preparedMailto}
                          className="inline-flex items-center gap-1.5 font-bold text-[#173D2D] hover:underline"
                        >
                          <Mail className="size-4" aria-hidden="true" />
                          <span>Open Email Draft Directly</span>
                        </a>
                        {isCommercialRoute && (
                          <a
                            href={contextualWhatsappUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1.5 font-bold text-[#173D2D] hover:underline"
                          >
                            <MessageSquare className="size-4" aria-hidden="true" />
                            <span>Or discuss via WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
