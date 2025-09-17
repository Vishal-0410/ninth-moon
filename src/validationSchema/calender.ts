import { z } from 'zod';

const dateSchema = z.preprocess(
  (arg) => (typeof arg === "string" || arg instanceof Date) ? new Date(arg) : arg,
  z.date({ invalid_type_error: "Date must be a valid date" })
);
const fullNoteSchema = z.object({
  date: dateSchema,
  note: z.string().min(1, { message: "Note is required" }),
});

export const addNoteSchema = fullNoteSchema;
export const updateNoteSchema = fullNoteSchema.partial();

export const getUserNotesSchema = z.object({
  page: z.coerce.number().int().min(1, { message: "Page must be a positive integer" }).default(1),
  limit: z.coerce.number().int().min(1, { message: "Limit must be a positive integer" }).default(10),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type GetUserNotesInput = z.infer<typeof getUserNotesSchema>;