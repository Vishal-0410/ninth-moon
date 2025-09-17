import { Router, type Router as ExpressRouter } from "express";
import { AuthMiddleware } from "@middlewares/auth";

import { ValidationMiddleware } from "../middlewares/schemaValidator";
import {createCommentSchema, createPostSchema, createReplySchema, createReportSchema, updateCommentSchema, updatePostSchema, updateReplySchema } from "@validationSchema/journal";
import { BlockUser, BookmarkPost, CreateComment, CreatePost, CreateReply, CreateReport, GetCommentById, GetComments, GetPostById, GetPosts, GetReplies, GetReplyById, HideComment, HidePost, HideReply, LikeComment, LikePost, LikeReply, RemovePost, UpdateComment, UpdatePost, UpdateReply } from "@controllers/journal";

const router: ExpressRouter = Router();

router.post("/post/report/:targetId", AuthMiddleware, ValidationMiddleware(createReportSchema), CreateReport);

router.get("/posts", AuthMiddleware, GetPosts);
router.post("/posts", AuthMiddleware, ValidationMiddleware(createPostSchema), CreatePost);
router.get("/posts/:postId", AuthMiddleware, GetPostById);
router.put("/posts/:postId", AuthMiddleware, ValidationMiddleware(updatePostSchema), UpdatePost);
router.post("/posts/:postId/hide-post", AuthMiddleware, HidePost);
router.post("/posts/:postId/bookmark-post", AuthMiddleware, BookmarkPost);
router.post("/posts/:postId/like-post", AuthMiddleware, LikePost);
router.post("/posts/:postId/remove-post", AuthMiddleware, RemovePost);
router.post("/posts/:postId/block-user", AuthMiddleware, BlockUser);

router.get("/posts/:postId/comments", AuthMiddleware, GetComments);
router.post("/posts/:postId/comments", AuthMiddleware, ValidationMiddleware(createCommentSchema), CreateComment);
router.get("/posts/:postId/comments/:commentId", AuthMiddleware, GetCommentById);
router.put("/posts/:postId/comments/:commentId", AuthMiddleware, ValidationMiddleware(updateCommentSchema), UpdateComment);
router.post("/posts/:postId/comments/:commentId/hide-comment", AuthMiddleware, HideComment);
router.post("/posts/:postId/comments/:commentId/likes", AuthMiddleware, LikeComment);

router.get("/posts/:postId/comments/:commentId/replies", AuthMiddleware, GetReplies);
router.post("/posts/:postId/comments/:commentId/replies", AuthMiddleware, ValidationMiddleware(createReplySchema), CreateReply);
router.get("/posts/:postId/comments/:commentId/replies/:replyId", AuthMiddleware, GetReplyById);
router.put("/posts/:postId/comments/:commentId/replies/:replyId", AuthMiddleware, ValidationMiddleware(updateReplySchema), UpdateReply);
router.post("/posts/:postId/comments/:commentId/replies/:replyId/hide-reply", AuthMiddleware, HideReply);
router.post("/posts/:postId/comments/:commentId/replies/:replyId/like-reply", AuthMiddleware, LikeReply);

export default router;