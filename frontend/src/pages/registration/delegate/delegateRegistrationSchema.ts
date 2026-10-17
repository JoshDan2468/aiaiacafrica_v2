import { z } from "zod";

const requiredText = (label: string, min = 2, max = 200) =>
  z.string().trim().min(min, `${label} is required.`).max(max, `${label} is too long.`);

export const delegateRegistrationSchema = z
  .object({
    delegateType: z.enum(["PROFESSIONAL", "STUDENT"]),
    packageId: z.string().uuid("Choose an available delegate package."),
    firstName: requiredText("First name", 1, 100),
    lastName: requiredText("Last name", 1, 100),
    email: z.string().trim().email("Enter a valid email address.").max(254),
    mobile: requiredText("Mobile number", 5, 40),
    telephone: z.string().trim().max(40, "Telephone is too long."),
    jobTitle: z.string().trim().max(150, "Job title is too long."),
    companyName: z.string().trim().max(150, "Company name is too long."),
    country: requiredText("Country", 2, 100),
    primaryActivity: z.string().trim().max(200, "Primary activity is too long."),
    mainObjective: requiredText("Main objective", 10, 1000),
    heardAboutSource: requiredText("How you heard about AIAIAC", 2, 200),
    privacyConsent: z.boolean().refine((value) => value, "Privacy consent is required."),
    dataSharingConsent: z.boolean(),
    institutionName: z.string().trim().max(200, "Institution name is too long."),
    institutionCountry: z.string().trim().max(100, "Institution country is too long."),
    programmeOfStudy: z.string().trim().max(200, "Programme of study is too long."),
    studentIdentificationNumber: z.string().trim().max(100, "Student ID is too long."),
    expectedGraduationYear: z.string().trim(),
    institutionalEmail: z.union([
      z.literal(""),
      z.string().trim().email("Enter a valid institutional email address.").max(254),
    ]),
  })
  .superRefine((values, context) => {
    const requiredFor = (
      key:
        | "jobTitle"
        | "companyName"
        | "primaryActivity"
        | "institutionName"
        | "institutionCountry"
        | "programmeOfStudy"
        | "studentIdentificationNumber"
        | "expectedGraduationYear",
      label: string,
    ) => {
      if (!values[key].trim()) {
        context.addIssue({ code: "custom", path: [key], message: `${label} is required.` });
      }
    };

    if (values.delegateType === "PROFESSIONAL") {
      requiredFor("jobTitle", "Job title");
      requiredFor("companyName", "Company name");
      requiredFor("primaryActivity", "Primary activity");
      return;
    }

    requiredFor("institutionName", "Institution name");
    requiredFor("institutionCountry", "Institution country");
    requiredFor("programmeOfStudy", "Programme of study");
    requiredFor("studentIdentificationNumber", "Student ID / registration number");
    requiredFor("expectedGraduationYear", "Expected graduation year");
    if (
      values.expectedGraduationYear &&
      (!/^\d{4}$/.test(values.expectedGraduationYear) ||
        Number(values.expectedGraduationYear) < 2026 ||
        Number(values.expectedGraduationYear) > 2100)
    ) {
      context.addIssue({
        code: "custom",
        path: ["expectedGraduationYear"],
        message: "Enter a graduation year between 2026 and 2100.",
      });
    }
  });

export type DelegateRegistrationFormValues = z.infer<typeof delegateRegistrationSchema>;
