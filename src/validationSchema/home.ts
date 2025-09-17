 import {z} from 'zod'

export const moodInputSchema = z.object({
  mood:z.enum([
    'great',
    'good',
    'okay',
    'sad',
    'anxious',
  ]),
})
export const symptomInputSchema = z.object({
  symptoms: z
    .array(
      z.enum(["Back Pain", "Bloating", "Contractions", "Constipation", "Cramping", "Dizziness", "Food aversions", "Exhaustion", "Itching", "Spotting", "Discharge", "Headaches", "Swelling"])
    )
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate symptoms are not allowed"
    })
});
export const fertilityHomeLatestLMPSchema = z.object({
  lastMenstrualPeriod: z.string().min(1, "Last menstrual period is required"),
});
export type MoodInput = z.infer<typeof moodInputSchema>;
export type SymptomInput = z.infer<typeof symptomInputSchema>;
export type FertilityHomeLatestLMPInput = z.infer<typeof fertilityHomeLatestLMPSchema>;