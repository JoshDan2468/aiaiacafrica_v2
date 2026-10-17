import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { enquiryTypeValues, type EnquiryType } from "@/data/contact";
import {
  createEnquiryIdempotencyKey,
  submitEnquiry,
  type EnquiryCategory,
} from "@/services/enquiry/enquiryService";
import {
  contactFormSchema,
  type ContactFormInput,
  type ContactFormValues,
} from "./contactFormSchema";

const enquiryRouteDescriptions: Record<EnquiryType, string> = {
  "General Enquiry":
    "Overall event questions, conference attendance, venue details and delegate planning.",
  "Delegate Enquiry":
    "Delegate registration passes, technical hall access, individual and corporate booking.",
  "Sponsorship Enquiry":
    "Commercial partnership tiers, brand visibility packages, and executive networking.",
  "Exhibition Enquiry":
    "Stand bookings, equipment showcase space, floor plans and exhibitor packages.",
  "Speaker or Abstract Enquiry":
    "Technical paper submission, speaker participation, presentation topics and agenda.",
  "Media Enquiry":
    "Press accreditation, broadcast access, interviews, press releases and media kits.",
  "Partnership Enquiry": "Organisational collaboration and partnership discussions.",
  "Other Enquiry": "Questions that do not fit another enquiry route.",
};

const categoryByType: Record<EnquiryType, EnquiryCategory> = {
  "General Enquiry": "GENERAL",
  "Delegate Enquiry": "REGISTRATION",
  "Sponsorship Enquiry": "SPONSORSHIP",
  "Exhibition Enquiry": "EXHIBITION",
  "Speaker or Abstract Enquiry": "SPEAKER_ABSTRACT",
  "Media Enquiry": "MEDIA",
  "Partnership Enquiry": "PARTNERSHIP",
  "Other Enquiry": "OTHER",
};

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
      {message}
    </p>
  );
}

export function ContactFormSection() {
  const [searchParams] = useSearchParams();
  const [reference, setReference] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const requestKey = useRef<string | null>(null);
  const previousPayload = useRef<string | null>(null);

  // Map URL parameter ?type= to appropriate default
  const paramType = searchParams.get("type")?.toLowerCase();
  let defaultType: EnquiryType = "General Enquiry";
  if (paramType === "media") defaultType = "Media Enquiry";
  else if (paramType === "sponsor" || paramType === "sponsorship")
    defaultType = "Sponsorship Enquiry";
  else if (paramType === "exhibit" || paramType === "exhibition")
    defaultType = "Exhibition Enquiry";
  else if (paramType === "delegate") defaultType = "Delegate Enquiry";
  else if (paramType === "speaker" || paramType === "abstract")
    defaultType = "Speaker or Abstract Enquiry";
  else if (paramType === "partner" || paramType === "partnership")
    defaultType = "Partnership Enquiry";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormInput, unknown, ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      workEmail: "",
      phoneNumber: "",
      organisation: "",
      enquiryType: defaultType,
      subject: "",
      message: "",
    },
  });

  const selectedEnquiryType = watch("enquiryType");

  useEffect(() => {
    if (defaultType) {
      setValue("enquiryType", defaultType);
    }
  }, [defaultType, setValue]);

  const onSubmit = async (values: ContactFormValues) => {
    setSubmitError(null);
    const payload = JSON.stringify(values);
    const idempotencyKey =
      previousPayload.current === payload && requestKey.current
        ? requestKey.current
        : createEnquiryIdempotencyKey();
    previousPayload.current = payload;
    requestKey.current = idempotencyKey;
    const result = await submitEnquiry({
      idempotencyKey,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.workEmail,
      ...(values.phoneNumber ? { phone: values.phoneNumber } : {}),
      ...(values.organisation ? { organization: values.organisation } : {}),
      category: categoryByType[values.enquiryType],
      subject: values.subject,
      message: values.message,
    });
    if (result.ok) {
      setReference(result.reference);
      requestKey.current = null;
    } else {
      setSubmitError(result.error);
    }
  };

  return (
    <section id="enquiry-form" className="bg-[#FFFFFF] py-16 text-[#102C20] sm:py-20 lg:py-24">
      <div className="shell max-w-[1240px]">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: How Can We Help? (~38%) */}
          <AnimatedSection once className="lg:col-span-5 xl:col-span-5">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#102C20] sm:text-3xl">
              How Can We Help?
            </h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-[#4A5D52]">
              Select the appropriate enquiry route below to ensure your message connects with the
              responsible team coordinator.
            </p>

            <div className="mt-8 space-y-3">
              {enquiryTypeValues.map((type) => {
                const isSelected = selectedEnquiryType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue("enquiryType", type)}
                    className={`w-full text-left rounded-[14px] p-4 transition-all duration-200 border ${
                      isSelected
                        ? "border-[#173D2D] bg-[#F5F2E9]"
                        : "border-[#E5ECE5] bg-[#FAFCFA] hover:border-[#CAD7CE] hover:bg-[#F7F9F7]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[15px] font-bold ${
                          isSelected ? "text-[#102C20]" : "text-[#2B3F35]"
                        }`}
                      >
                        {type}
                      </span>
                      {isSelected && (
                        <Check className="size-4 text-[#173D2D] shrink-0" aria-hidden="true" />
                      )}
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-[#5A6D62]">
                      {enquiryRouteDescriptions[type]}
                    </p>
                  </button>
                );
              })}
            </div>
          </AnimatedSection>

          {/* Right Column: Send an Enquiry Form (~62%) */}
          <AnimatedSection delay={0.08} once className="lg:col-span-7 xl:col-span-7">
            <div className="rounded-[20px] border border-[#E2E8E2] bg-[#FFFFFF] p-7 sm:p-10 shadow-xs">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl">
                Send an Enquiry
              </h2>
              <p className="mt-2 text-[15.5px] leading-relaxed text-[#4A5D52]">
                Please complete the form below. All required fields are marked with an asterisk.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6" noValidate>
                {/* Row 1: First and last name */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-full-name"
                      className="block text-[14.5px] font-semibold text-[#102C20]"
                    >
                      First Name <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      id="contact-full-name"
                      type="text"
                      autoComplete="given-name"
                      placeholder="e.g. Amina"
                      aria-required="true"
                      aria-invalid={errors.firstName ? "true" : undefined}
                      aria-describedby={errors.firstName ? "contact-full-name-error" : undefined}
                      className="mt-2 h-[52px] w-full rounded-[12px] border border-[#D5DDD5] bg-[#FFFFFF] px-4 py-3 text-[15px] text-[#102C20] outline-none transition-all placeholder:text-[#58675F]/60 focus:border-[#173D2D] focus:ring-2 focus:ring-[#CFEA3B]/40 aria-[invalid=true]:border-red-600"
                      {...register("firstName")}
                    />
                    <FieldError id="contact-full-name-error" message={errors.firstName?.message} />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-last-name"
                      className="block text-[14.5px] font-semibold text-[#102C20]"
                    >
                      Last Name <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      id="contact-last-name"
                      type="text"
                      autoComplete="family-name"
                      placeholder="e.g. Okafor"
                      aria-required="true"
                      aria-invalid={errors.lastName ? "true" : undefined}
                      aria-describedby={errors.lastName ? "contact-last-name-error" : undefined}
                      className="mt-2 h-[52px] w-full rounded-[12px] border border-[#D5DDD5] bg-[#FFFFFF] px-4 py-3 text-[15px] text-[#102C20] outline-none transition-all placeholder:text-[#58675F]/60 focus:border-[#173D2D] focus:ring-2 focus:ring-[#CFEA3B]/40 aria-[invalid=true]:border-red-600"
                      {...register("lastName")}
                    />
                    <FieldError id="contact-last-name-error" message={errors.lastName?.message} />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-work-email"
                      className="block text-[14.5px] font-semibold text-[#102C20]"
                    >
                      Work Email <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      id="contact-work-email"
                      type="email"
                      autoComplete="email"
                      placeholder="e.g. amina@organisation.com"
                      aria-required="true"
                      aria-invalid={errors.workEmail ? "true" : undefined}
                      aria-describedby={errors.workEmail ? "contact-work-email-error" : undefined}
                      className="mt-2 h-[52px] w-full rounded-[12px] border border-[#D5DDD5] bg-[#FFFFFF] px-4 py-3 text-[15px] text-[#102C20] outline-none transition-all placeholder:text-[#58675F]/60 focus:border-[#173D2D] focus:ring-2 focus:ring-[#CFEA3B]/40 aria-[invalid=true]:border-red-600"
                      {...register("workEmail")}
                    />
                    <FieldError id="contact-work-email-error" message={errors.workEmail?.message} />
                  </div>
                </div>

                {/* Row 2: Phone Number & Organisation */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="block text-[14.5px] font-semibold text-[#102C20]"
                    >
                      Phone Number
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="e.g. +234 801 234 5678"
                      aria-invalid={errors.phoneNumber ? "true" : undefined}
                      aria-describedby={errors.phoneNumber ? "contact-phone-error" : undefined}
                      className="mt-2 h-[52px] w-full rounded-[12px] border border-[#D5DDD5] bg-[#FFFFFF] px-4 py-3 text-[15px] text-[#102C20] outline-none transition-all placeholder:text-[#58675F]/60 focus:border-[#173D2D] focus:ring-2 focus:ring-[#CFEA3B]/40 aria-[invalid=true]:border-red-600"
                      {...register("phoneNumber")}
                    />
                    <FieldError id="contact-phone-error" message={errors.phoneNumber?.message} />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-organisation"
                      className="block text-[14.5px] font-semibold text-[#102C20]"
                    >
                      Organisation
                    </label>
                    <input
                      id="contact-organisation"
                      type="text"
                      autoComplete="organization"
                      placeholder="e.g. West Africa Energy"
                      aria-invalid={errors.organisation ? "true" : undefined}
                      aria-describedby={
                        errors.organisation ? "contact-organisation-error" : undefined
                      }
                      className="mt-2 h-[52px] w-full rounded-[12px] border border-[#D5DDD5] bg-[#FFFFFF] px-4 py-3 text-[15px] text-[#102C20] outline-none transition-all placeholder:text-[#58675F]/60 focus:border-[#173D2D] focus:ring-2 focus:ring-[#CFEA3B]/40 aria-[invalid=true]:border-red-600"
                      {...register("organisation")}
                    />
                    <FieldError
                      id="contact-organisation-error"
                      message={errors.organisation?.message}
                    />
                  </div>
                </div>

                {/* Row 3: Enquiry Type & Subject */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-enquiry-type"
                      className="block text-[14.5px] font-semibold text-[#102C20]"
                    >
                      Enquiry Type <span className="text-emerald-700">*</span>
                    </label>
                    <select
                      id="contact-enquiry-type"
                      aria-required="true"
                      aria-invalid={errors.enquiryType ? "true" : undefined}
                      aria-describedby={
                        errors.enquiryType ? "contact-enquiry-type-error" : undefined
                      }
                      className="mt-2 h-[52px] w-full rounded-[12px] border border-[#D5DDD5] bg-[#FFFFFF] px-4 py-3 text-[15px] text-[#102C20] outline-none transition-all focus:border-[#173D2D] focus:ring-2 focus:ring-[#CFEA3B]/40 aria-[invalid=true]:border-red-600"
                      {...register("enquiryType")}
                    >
                      {enquiryTypeValues.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <FieldError
                      id="contact-enquiry-type-error"
                      message={errors.enquiryType?.message}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-subject"
                      className="block text-[14.5px] font-semibold text-[#102C20]"
                    >
                      Subject <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      placeholder="e.g. Exhibition space availability"
                      aria-required="true"
                      aria-invalid={errors.subject ? "true" : undefined}
                      aria-describedby={errors.subject ? "contact-subject-error" : undefined}
                      className="mt-2 h-[52px] w-full rounded-[12px] border border-[#D5DDD5] bg-[#FFFFFF] px-4 py-3 text-[15px] text-[#102C20] outline-none transition-all placeholder:text-[#58675F]/60 focus:border-[#173D2D] focus:ring-2 focus:ring-[#CFEA3B]/40 aria-[invalid=true]:border-red-600"
                      {...register("subject")}
                    />
                    <FieldError id="contact-subject-error" message={errors.subject?.message} />
                  </div>
                </div>

                {/* Row 4: Message */}
                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-[14.5px] font-semibold text-[#102C20]"
                  >
                    Message <span className="text-emerald-700">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    placeholder="Please provide details regarding your enquiry..."
                    aria-required="true"
                    aria-invalid={errors.message ? "true" : undefined}
                    aria-describedby={errors.message ? "contact-message-error" : undefined}
                    className="mt-2 min-h-[160px] w-full rounded-[12px] border border-[#D5DDD5] bg-[#FFFFFF] p-4 text-[15px] text-[#102C20] outline-none transition-all placeholder:text-[#58675F]/60 focus:border-[#173D2D] focus:ring-2 focus:ring-[#CFEA3B]/40 aria-[invalid=true]:border-red-600"
                    {...register("message")}
                  />
                  <FieldError id="contact-message-error" message={errors.message?.message} />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || Boolean(reference)}
                    className="inline-flex h-[52px] items-center justify-center rounded-[14px] bg-[#CFEA3B] px-8 text-[15px] font-semibold text-[#102C20] transition-colors hover:bg-[#bfe028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFEA3B] disabled:opacity-60"
                  >
                    <span>{isSubmitting ? "Sending…" : "Send Enquiry"}</span>
                  </button>
                </div>

                {submitError && (
                  <p role="alert" className="text-sm font-semibold text-red-700">
                    {submitError}
                  </p>
                )}
                {reference && (
                  <div
                    role="status"
                    className="rounded-[14px] border border-[#173D2D]/20 bg-[#F5F2E9] p-5 text-sm text-[#102C20]"
                  >
                    <p className="font-bold">Your enquiry has been received.</p>
                    <p className="mt-2">
                      Reference: {reference}. Please keep this for future correspondence.
                    </p>
                    <p className="mt-2">
                      An acknowledgement will be sent to your email if delivery is available.
                    </p>
                  </div>
                )}
              </form>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
