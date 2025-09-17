import { z } from "zod";

export const NotificationTypeEnum = z.enum([
  "personal",
  "appointments",
  "medical",
]);

export const RepeatEnum = z.enum([
  "never",
  "hourly",
  "daily",
  "weekly",
  "weekdays",
  "weekends",
  "biweekly",
  "monthly",
]);

export const StatusEnum = z.enum([
  "unread",
  "done",
  "snoozed",
  "deleted",
]);

export const createNotificationSchema = z.object({
  message: z.string().min(3, "Title must be at least 3 characters"),
  type: NotificationTypeEnum,
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format (expected YYYY-MM-DD)",
  }),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  repeat: RepeatEnum.default("never"),
});

export const updateNotificationSchema = z.object({
  meesage: z.string().min(3, "Title must be at least 3 characters").optional(),
  type: NotificationTypeEnum,
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    })
    .optional(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format")
    .optional(),
  repeat: RepeatEnum.optional(),
});

export const actionNotificationSchema = z.object({
  action: z.enum(["delete", "done", "snooze"]),
});


export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type ActionNotificationInput = z.infer<typeof actionNotificationSchema>;

