import { Request, Response } from "express";
import { asyncHandler } from "@utils/asyncHandler";
import { HTTP_STATUS } from "@traits/httpStatus";
import { ApiResponse } from "@utils/apiResponse";
import {
  BlockUserService,
  BookmarkPostService,
  CreateCommentService,
  CreatePostService,
  CreateReplyService,
  CreateReportService,
  GetCommentByIdService,
  GetCommentsService,
  GetPostByIdService,
  GetPostsService,
  GetRepliesService,
  GetReplyByIdService,
  HideCommentService,
  HidePostService,
  HideReplyService,
  LikeCommentService,
  LikePostService,
  LikeReplyService,
  RemovePostService,
  UpdateCommentService,
  UpdatePostService,
  UpdateReplyService,
} from "@services/journal";
import {
  CreateCommentInput,
  CreatePostInput,
  CreateReplyInput,
  CreateReportInput,
  getPostsQuerySchema,
  UpdateCommentInput,
  UpdatePostInput,
  UpdateReplyInput,
} from "@validationSchema/journal";
import { ApiError } from "@utils/apiError";

export const BlockUser = asyncHandler(async (req: Request, res: Response) => {
  const { uid } = req?.user!;
  const { postId } = req.params;
  const blockedUser = await BlockUserService(uid, postId);
  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, blockedUser, "User blocked successfully")
    );
});

export const CreateReport = asyncHandler(
  async (req: Request, res: Response) => {
    const { uid } = req?.user!;
    const { targetId } = req.params;
    const { targetType, reason }: CreateReportInput = req.body;
    const report = await CreateReportService(uid, targetType, targetId, reason);
    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, report, "Report created successfully")
      );
  }
);

export const CreatePost = asyncHandler(async (req: Request, res: Response) => {
  const { heading, content, visibility, category }: CreatePostInput = req.body;
  const { uid } = req?.user!;
  const post = await CreatePostService(
    uid,
    heading,
    content,
    visibility,
    category
  );
  res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(HTTP_STATUS.CREATED, post, "Post created successfully")
    );
});

export const GetPosts = asyncHandler(async (req: Request, res: Response) => {
  const { uid } = req?.user!;
  const validatedQuery = getPostsQuerySchema.safeParse(req.query);

  if (!validatedQuery.success) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Invalid query parameters: ${validatedQuery.error.issues[0].message}`
    );
  }

  const category = req.query.category as string;
  const sortBy = req.query.sortBy as
    | "latest"
    | "trending"
    | "my_posts"
    | "hidden"
    | "bookmarks";
  const query = req.query.query as string | undefined;
  const cursor = req.query.cursor as string | undefined;
  const limit = Number(req.query.limit) || 10;
  const trendingDays = Number(req.query.trendingDays) || 7;

  const { posts, pagination } = await GetPostsService(
    uid,
    category,
    sortBy,
    query,
    limit,
    cursor,
    trendingDays
  );
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, posts, "Posts retrieved successfully", {
      pagination,
    })
  );
});

export const GetPostById = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { uid } = req?.user!;
  const post = await GetPostByIdService(uid, postId);
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, post, "Post retrieved successfully"));
});

export const UpdatePost = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { heading, content, visibility, category }: UpdatePostInput = req.body;
  const { uid } = req?.user!;
  const post = await UpdatePostService(
    uid,
    postId,
    heading,
    content,
    visibility,
    category
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, post, "Post updated successfully"));
});

export const HidePost = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { uid } = req?.user!;
  const { id, message } = await HidePostService(uid, postId);
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, { id }, message));
});

export const BookmarkPost = asyncHandler(
  async (req: Request, res: Response) => {
    const { postId } = req.params;
    const { uid } = req?.user!;
    const { id, message } = await BookmarkPostService(uid, postId);
    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, { id }, message));
  }
);

export const RemovePost = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { uid } = req?.user!;
  const { id, message } = await RemovePostService(uid, postId);
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, { id }, message));
});

export const LikePost = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { uid } = req?.user!;
  const { id, message } = await LikePostService(uid, postId);
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, { id }, message));
});

export const CreateComment = asyncHandler(
  async (req: Request, res: Response) => {
    const { postId } = req.params;
    const { text }: CreateCommentInput = req.body;
    const { uid } = req?.user!;
    const comment = await CreateCommentService(uid, postId, text);
    res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          comment,
          "Comment created successfully"
        )
      );
  }
);

export const HideComment = asyncHandler(async (req: Request, res: Response) => {
  const { postId, commentId } = req.params;
  const { uid } = req?.user!;
  const { id, message } = await HideCommentService(uid, postId, commentId);
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, { id }, message));
});

export const GetComments = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { uid } = req.user!;

  const cursor = req.query.cursor as string | undefined;
  const limit = Number(req.query.limit) || 10;

  const comments = await GetCommentsService(postId, uid, limit, cursor);

  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        comments,
        "Comments retrieved successfully"
      )
    );
});

export const GetCommentById = asyncHandler(
  async (req: Request, res: Response) => {
    const { postId, commentId } = req.params;
    const comment = await GetCommentByIdService(postId, commentId);
    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          comment,
          "Comment retrieved successfully"
        )
      );
  }
);

export const UpdateComment = asyncHandler(
  async (req: Request, res: Response) => {
    const { postId, commentId } = req.params;
    const { text }: UpdateCommentInput = req.body;
    const { uid } = req?.user!;
    const comment = await UpdateCommentService(uid, postId, commentId, text);
    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, comment, "Comment updated successfully")
      );
  }
);

export const LikeComment = asyncHandler(async (req: Request, res: Response) => {
  const { postId, commentId } = req.params;
  const { uid } = req?.user!;
  const comment = await LikeCommentService(uid, postId, commentId);
  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, comment, "Comment liked successfully")
    );
});

export const CreateReply = asyncHandler(async (req: Request, res: Response) => {
  const { postId, commentId } = req.params;
  const { text }: CreateReplyInput = req.body;
  const { uid } = req?.user!;
  const reply = await CreateReplyService(uid, postId, commentId, text);
  res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(HTTP_STATUS.CREATED, reply, "Reply created successfully")
    );
});

export const GetReplies = asyncHandler(async (req: Request, res: Response) => {
  const { postId, commentId } = req.params;
  const { uid } = req.user!;
  const cursor = req.query.cursor as string | undefined;
  const limit = Number(req.query.limit) || 10;

  const replies = await GetRepliesService(uid, postId, commentId, limit, cursor);
  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, replies, "Replies retrieved successfully")
    );
});

export const GetReplyById = asyncHandler(
  async (req: Request, res: Response) => {
    const { postId, commentId, replyId } = req.params;
    const reply = await GetReplyByIdService(postId, commentId, replyId);
    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, reply, "Reply retrieved successfully")
      );
  }
);

export const UpdateReply = asyncHandler(async (req: Request, res: Response) => {
  const { postId, commentId, replyId } = req.params;
  const { text }: UpdateReplyInput = req.body;
  const { uid } = req?.user!;
  const reply = await UpdateReplyService(uid, postId, commentId, replyId, text);
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, reply, "Reply updated successfully"));
});

export const HideReply = asyncHandler(async (req: Request, res: Response) => {
  const { postId, commentId, replyId } = req.params;
  const { uid } = req?.user!;
  const { id, message } = await HideReplyService(
    uid,
    postId,
    commentId,
    replyId
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, { id }, message));
});

export const LikeReply = asyncHandler(async (req: Request, res: Response) => {
  const { postId, commentId, replyId } = req.params;
  const { uid } = req?.user!;
  const { id, message } = await LikeReplyService(
    uid,
    postId,
    commentId,
    replyId
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, { id }, message));
});
