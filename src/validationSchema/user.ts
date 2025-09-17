import { z } from "zod";
import timezonesList  from "timezones-list";

const timezones = Array.isArray(timezonesList) ? timezonesList : (timezonesList as any).default;
const timeZoneIds = timezones.map((tz:any) => tz.tzCode);

export const userInputSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    dob: z.preprocess(
      (arg) => (typeof arg === "string" || arg instanceof Date ? new Date(arg) : arg),
      z.date().refine((data) => data instanceof Date, {
        message: "Date of birth must be a valid date",
      })
    ),
    country: z.string().min(1, "Country is required"),
    timezone: z.string().refine((tz) => timeZoneIds.includes(tz), {
    message: "Invalid timezone",
  }),
  privacy_policy_accepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),

    journey: z.enum([
      "pregnant",
      "caregiver",
      "miscarriage",
      "abortion",
      "fertility",
    ]),
    first_day_of_last_menstrual_cycle: z.preprocess(
      (arg) => (typeof arg === "string" || arg instanceof Date ? new Date(arg) : arg),
      z.date().optional()
    ),
    current_trimester: z.enum(["first", "second", "third"]).optional(),
    current_week: z
      .number()
      .min(1, "Current week must be at least 1")
      .optional(),
    due_date: z.preprocess(
      (arg) => (typeof arg === "string" || arg instanceof Date ? new Date(arg) : arg),
      z.date().optional()
    ),
    medications_taking: z.array(z.string()).optional(),
    diet_preference: z.array(z.string()).optional(),
    kind_of_support_needed: z
      .enum([
        "emotional_support",
        "partner_bonding",
        "medical_FAQs",
        "stressManagement",
        "daily_reminders",
      ])
      .optional(),
    miscarriage_occur: z.preprocess(
      (arg) => (typeof arg === "string" || arg instanceof Date ? new Date(arg) : arg),
      z.date().optional()
    ),
    medical_support_for_recovery: z
      .enum(["yes", "no", "prefer_no_to_say"])
      .optional(),
    is_first_miscarriage: z.enum(["yes", "no"]).optional(),
    physical_symptoms: z.array(z.string()).optional(),
    abortion_occur: z.preprocess(
      (arg) => (typeof arg === "string" || arg instanceof Date ? new Date(arg) : arg),
      z.date().optional()
    ),
    is_elective_or_medical: z
      .enum(["elective", "medical", "prefer_no_to_say"])
      .optional(),
    currently_trying_to_conceive: z.enum(["yes", "no"]).optional(),
    avg_cycle_length: z
      .number()
      .min(1, "Average cycle length must be at least 1")
      .optional(),
    luteal_length: z
      .number()
      .min(1, "Luteal length must be at least 1")
      .optional(),
    currently_undergoing_fertility_treatment: z
      .enum(["yes", "no", "considering", "prefer_no_to_say"])
      .optional(),
    health_conditions: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    // Shared validation for pregnant and caregiver
    if (
      data.journey === "pregnant" ||
      data.journey === "caregiver"
    ) {
      if (!data.first_day_of_last_menstrual_cycle) {
        ctx.addIssue({
          code: "custom",
          path: ["first_day_of_last_menstrual_cycle"],
          message: "First day of last menstrual cycle is required",
        });
      }
      if (!data.current_trimester) {
        ctx.addIssue({
          code: "custom",
          path: ["current_trimester"],
          message: "Current trimester is required",
        });
      }
      if (!data.current_week) {
        ctx.addIssue({
          code: "custom",
          path: ["current_week"],
          message: "Current week is required",
        });
      }
      if (!data.due_date) {
        ctx.addIssue({
          code: "custom",
          path: ["due_date"],
          message: "Due date is required",
        });
      }
      if (!data.health_conditions || data.health_conditions.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["health_conditions"],
          message: "Please specify any health conditions",
        });
      }
      if (
        !data.medications_taking ||
        data.medications_taking.length === 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["medications_taking"],
          message: "Please specify if you are taking any medications",
        });
      }
      if (!data.diet_preference || data.diet_preference.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["diet_preference"],
          message: "Diet preference is required",
        });
      }
      if (!data.kind_of_support_needed) {
        ctx.addIssue({
          code: "custom",
          path: ["kind_of_support_needed"],
          message: "Please select the kind of support needed",
        });
      }
    }

    // Miscarriage-specific validation
    if (data.journey === "miscarriage") {
      if (!data.miscarriage_occur) {
        ctx.addIssue({
          code: "custom",
          path: ["miscarriage_occur"],
          message: "Date of miscarriage is required",
        });
      }
      if (!data.medical_support_for_recovery) {
        ctx.addIssue({
          code: "custom",
          path: ["medical_support_for_recovery"],
          message: "Medical support for recovery is required",
        });
      }
      if (!data.is_first_miscarriage) {
        ctx.addIssue({
          code: "custom",
          path: ["is_first_miscarriage"],
          message: "This information is required",
        });
      }
      if (!data.physical_symptoms || data.physical_symptoms.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["physical_symptoms"],
          message: "Physical symptoms are required",
        });
      }
      if (
        !data.medications_taking ||
        data.medications_taking.length === 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["medications_taking"],
          message:
            "Please specify if you are taking any medications for recovery",
        });
      }
      if (!data.diet_preference || data.diet_preference.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["diet_preference"],
          message: "Diet preference is required",
        });
      }
      if (!data.kind_of_support_needed) {
        ctx.addIssue({
          code: "custom",
          path: ["kind_of_support_needed"],
          message: "Please select the kind of support needed",
        });
      }
    }

    // Abortion-specific validation
    if (data.journey === "abortion") {
      if (!data.abortion_occur) {
        ctx.addIssue({
          code: "custom",
          path: ["abortion_occur"],
          message: "Date of abortion is required",
        });
      }
      if (!data.is_elective_or_medical) {
        ctx.addIssue({
          code: "custom",
          path: ["is_elective_or_medical"],
          message: "This information is required",
        });
      }
      if (!data.is_first_miscarriage) {
        ctx.addIssue({
          code: "custom",
          path: ["is_first_miscarriage"],
          message: "This information is required",
        });
      }
      if (data.physical_symptoms && data.physical_symptoms.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["physical_symptoms"],
          message: "Physical symptoms are not applicable for abortion users",
        });
      }
      if (
        !data.medications_taking ||
        data.medications_taking.length === 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["medications_taking"],
          message:
            "Please specify if you are taking any medications for recovery",
        });
      }
      if (!data.diet_preference || data.diet_preference.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["diet_preference"],
          message: "Diet preference is required",
        });
      }
      if (!data.kind_of_support_needed) {
        ctx.addIssue({
          code: "custom",
          path: ["kind_of_support_needed"],
          message: "Please select the kind of support needed",
        });
      }
    }

    // Fertility challenges-specific validation
    if (data.journey === "fertility") {
      if (!data.first_day_of_last_menstrual_cycle) {
        ctx.addIssue({
          code: "custom",
          path: ["first_day_of_last_menstrual_cycle"],
          message: "First day of last menstrual cycle is required",
        });
      }
      if (!data.currently_trying_to_conceive) {
        ctx.addIssue({
          code: "custom",
          path: ["currently_trying_to_conceive"],
          message: "This information is required",
        });
      }
      if (!data.currently_undergoing_fertility_treatment) {
        ctx.addIssue({
          code: "custom",
          path: ["currently_undergoing_fertility_treatment"],
          message: "Please specify if you are currently undergoing fertility treatment",
        });
      }
      if (!data.health_conditions || data.health_conditions.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["health_conditions"],
          message: "Please specify any health conditions affecting fertility",
        });
      }
      if (
        !data.medications_taking ||
        data.medications_taking.length === 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["medications_taking"],
          message:
            "Please specify if you are taking any medications for fertility challenges",
        });
      }
      if (!data.diet_preference || data.diet_preference.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["diet_preference"],
          message: "Diet preference is required",
        });
      }
      if (!data.kind_of_support_needed) {
        ctx.addIssue({
          code: "custom",
          path: ["kind_of_support_needed"],
          message: "Please select the kind of support needed",
        });
      }
    }
  });

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  dob: z.preprocess(
    (arg) => (typeof arg === "string" || arg instanceof Date ? new Date(arg) : arg),
    z.date().refine((data) => data instanceof Date, {
      message: "Date of birth must be a valid date",
    })
  ).optional(),
  country: z.string().trim().min(1, "Country is required").optional(), 
  timezone: z.string().refine((tz) => timeZoneIds.includes(tz), {
    message: "Invalid timezone",
  }).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserInput = z.infer<typeof userInputSchema>;