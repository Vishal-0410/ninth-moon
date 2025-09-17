import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required." })
    .max(50, { message: "Name must be 50 characters or less." }),
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required." })
    .email({ message: "Invalid email address." }),
  location: z
    .string()
    .trim()
    .min(1, { message: "Location is required." })
    .max(100, { message: "Location must be 100 characters or less." }),
  subject: z.enum([
    "Feedback",
    "Technical issue",
    "Account/billing",
    "Partnership/Media",
    "Other",
  ], {
    errorMap: () => ({ message: "Please select a valid subject." }),
  }),
  message: z
    .string()
    .trim()
    .min(10, { message: "Message must be at least 10 characters long." })
});

export type ContactUsForm = z.infer<typeof contactFormSchema>;