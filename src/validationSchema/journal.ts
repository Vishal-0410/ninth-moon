import { z } from "zod";

export const createPostSchema = z.object({
  heading: z.string().min(1, "Heading is required"),
  content: z.string().min(1, "Content is required"),
  visibility: z.enum(["private", "public"]),
  category: z
    .enum(["pregnancy", "fertility_challenges", "miscarriage", "abortion"])
    .default("pregnancy"),
});

export const updatePostSchema = z.object({
  heading: z.string().min(1, "Heading is required").optional(),
  content: z.string().min(1, "Content is required").optional(),
  visibility: z.enum(["private", "public"]).optional(),
  category: z
    .enum(["pregnancy", "fertility_challenges", "miscarriage", "abortion"]).optional(),
});

export const createCommentSchema = z.object({
  text: z.string().min(1, "Text is required"),
});

export const updateCommentSchema = z.object({
  text: z.string().min(1, "Text is required").optional(),
});

export const createReplySchema = z.object({
  text: z.string().min(1, "Text is required"),
});

export const updateReplySchema = z.object({
  text: z.string().min(1, "Text is required").optional(),
});

export const getPostsQuerySchema = z.object({
  sortBy: z
    .enum(["latest", "trending", "my_posts", "hidden", "bookmarks"])
    .optional(),
  category: z
    .enum(["pregnancy", "fertility_challenges", "miscarriage", "abortion"])
    .default("pregnancy"),
  query: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  trendingDays: z.string().optional(),
});

export const createReportSchema = z.object({
  reason: z.string(),
  targetType: z.enum(["post", "comment", "reply"]),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateReplyInput = z.infer<typeof createReplySchema>;
export type UpdateReplyInput = z.infer<typeof updateReplySchema>;
export type GetPostsQuery = z.infer<typeof getPostsQuerySchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
