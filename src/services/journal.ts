import { db } from "@config/firebase";
import { COLLECTIONS } from "@constant/collection";
import { JOURNAL_ERRORS } from "@constant/errorMessages/journal";
import {
  BlockedUser,
  Comment,
  Like,
  Post,
  Reply,
  Report,
} from "@models/journal";
import { ApiError } from "@utils/apiError";
import { FieldValue, FieldPath } from "firebase-admin/firestore";

const STOPWORDS = new Set([
  "is",
  "am",
  "are",
  "the",
  "a",
  "an",
  "in",
  "on",
  "of",
  "and",
  "to",
  "for",
]);

const fetchInChunks = async <T>(
  collection: FirebaseFirestore.CollectionReference,
  field: string,
  ids: string[],
  queryConstraints: ((
    ref: FirebaseFirestore.Query
  ) => FirebaseFirestore.Query)[] = []
): Promise<T[]> => {
  const results: T[] = [];
  const chunkSize = 10;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunkIds = ids.slice(i, i + chunkSize);
    let ref: FirebaseFirestore.Query = collection.where(field, "in", chunkIds);
    queryConstraints.forEach((fn) => {
      ref = fn(ref);
    });
    const snap = await ref.get();
    snap.docs.forEach((doc) =>
      results.push({ id: doc.id, ...doc.data() } as unknown as T)
    );
  }

  return results;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/gi, ""))
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));
}

function searchByRelevancy(posts: any[], query: string) {
  const queryWords = tokenize(query);

  return posts
    .map((post) => {
      const headingWords = tokenize(post.heading || "");
      const contentWords = tokenize(post.content || "");

      let score = 0;

      for (const word of queryWords) {
        if (headingWords.includes(word)) score += 2;
        if (contentWords.includes(word)) score += 1;
      }

      return { ...post, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
}

export const BlockUserService = async (
  uid: string,
  postId: string
): Promise<BlockedUser> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);

  const postDoc = await postRef.get();
  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const postData = postDoc.data()!;
  const userToBlockUid = postData.uid;

  if (!userToBlockUid || uid === userToBlockUid) {
    throw new ApiError(
      JOURNAL_ERRORS.FORBIDDEN.statusCode,
      JOURNAL_ERRORS.FORBIDDEN.message
    );
  }

  const blockDocId = `${uid}_${userToBlockUid}`;
  const blockRef = db.collection(COLLECTIONS.BLOCKED_USERS).doc(blockDocId);

  const blockDoc = await blockRef.get();
  if (blockDoc.exists) {
    throw new ApiError(
      JOURNAL_ERRORS.USER_ALREADY_BLOCKED.statusCode,
      JOURNAL_ERRORS.USER_ALREADY_BLOCKED.message
    );
  }

  const now = new Date().toISOString();
  const blockedUserData: BlockedUser = {
    id: blockDocId,
    uid,
    blockedUid: userToBlockUid,
    createdAt: now,
    updatedAt: now,
  };

  await blockRef.set(blockedUserData);

  return blockedUserData;
};

export const CreateReportService = async (
  uid: string,
  targetType: "post" | "comment" | "reply",
  targetId: string,
  reason?: string
): Promise<Report> => {
  const targetConfig = {
    post: {
      collection: COLLECTIONS.POSTS,
      error: JOURNAL_ERRORS.POST_NOT_FOUND,
    },
    comment: {
      collection: COLLECTIONS.COMMENTS,
      error: JOURNAL_ERRORS.COMMENT_NOT_FOUND,
    },
    reply: {
      collection: COLLECTIONS.REPLIES,
      error: JOURNAL_ERRORS.REPLY_NOT_FOUND,
    },
  } as const;

  const { collection, error } = targetConfig[targetType];

  const targetDoc = await db.collection(collection).doc(targetId).get();
  if (!targetDoc.exists || targetDoc.data()?.status !== "active") {
    throw new ApiError(error.statusCode, error.message);
  }

  const reportDocId = `${uid}_${targetType}_${targetId}`;
  const reportRef = db.collection(COLLECTIONS.REPORTS).doc(reportDocId);
  const reportDoc = await reportRef.get();

  const now = new Date().toISOString();

  if (reportDoc.exists) {
    const data = reportDoc.data() as Report;
    const lastReportDate = new Date(data.updatedAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (lastReportDate > sevenDaysAgo) {
      throw new ApiError(
        JOURNAL_ERRORS.REPORT_ALREADY_EXISTS.statusCode,
        "You can only report this item once every 7 days."
      );
    }

    const updatedData: Report = {
      ...data,
      reason,
      updatedAt: now,
    };
    await reportRef.set(updatedData, { merge: true });
    return { id: reportRef.id, ...updatedData };
  }

  const newReport: Report = {
    id: reportDocId,
    reportedBy: uid,
    targetType,
    targetId,
    status: "pending",
    reason,
    createdAt: now,
    updatedAt: now,
  };

  await reportRef.set(newReport);
  return newReport;
};

export const CreatePostService = async (
  uid: string,
  heading: string,
  content: string,
  visibility: "private" | "public",
  category: "pregnancy" | "fertility_challenges" | "miscarriage" | "abortion"
): Promise<Partial<Post>> => {
  const createdAt = new Date().toISOString();
  const updatedAt = new Date().toISOString();

  const dataToStore = {
    uid,
    heading,
    content,
    category,
    visibility,
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    status: "active",
    removedAt: "",
    createdAt,
    updatedAt,
  } as Post;

  const postRef = await db.collection(COLLECTIONS.POSTS).add(dataToStore);
  return {
    id: postRef.id,
    uid,
    heading,
    content,
    category,
    visibility,
    createdAt,
    updatedAt,
  } as Partial<Post>;
};

export const GetPostsService = async (
  uid: string,
  category?: string,
  sortBy?: "latest" | "trending" | "my_posts" | "hidden" | "bookmarks",
  query?: string,
  limit = 10,
  cursor?: string,
  trendingDays = 7
) => {
  let posts: any[] = [];
  let nextCursor: string | null = null;

  if (sortBy === "bookmarks" || sortBy === "hidden") {
    const collectionName =
      sortBy === "bookmarks" ? COLLECTIONS.BOOKMARKS : COLLECTIONS.HIDDEN_ITEMS;

    let ref = db
      .collection(collectionName)
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc");

    if (cursor) {
      const cursorDoc = await db.collection(collectionName).doc(cursor).get();
      if (cursorDoc.exists) {
        ref = ref.startAfter(cursorDoc);
      }
    }

    const snap = await ref.limit(limit + 1).get();
    const docs = snap.docs;

    if (docs.length > limit) {
      nextCursor = docs[limit - 1].id;
    }

    const postIds = docs
      .slice(0, limit)
      .map((d) =>
        sortBy === "bookmarks" ? d.data().postId : d.data().itemId
      ) as string[];

    if (postIds.length === 0) {
      return {
        posts: [],
        pagination: { hasNextPage: false, nextCursor: null },
      };
    }

    const chunks: string[][] = [];
    for (let i = 0; i < postIds.length; i += 10) {
      chunks.push(postIds.slice(i, i + 10));
    }

    const postSnaps = await Promise.all(
      chunks.map((chunk) =>
        db
          .collection(COLLECTIONS.POSTS)
          .where(FieldPath.documentId(), "in", chunk)
          .get()
      )
    );

    const fetchedPosts = postSnaps.flatMap((snap) =>
      snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    );

    posts = postIds.map((id) => fetchedPosts.find((p) => p.id === id));

    const likedPostIds = new Set<string>();
    if (postIds.length) {
      const likeChunks: string[][] = [];
      for (let i = 0; i < postIds.length; i += 10) {
        likeChunks.push(postIds.slice(i, i + 10));
      }

      const likesSnaps = await Promise.all(
        likeChunks.map((chunk) =>
          db
            .collection(COLLECTIONS.LIKES)
            .where("uid", "==", uid)
            .where("targetId", "in", chunk)
            .where("targetType", "==", "post")
            .get()
        )
      );

      likesSnaps.forEach((snap) =>
        snap.docs.forEach((d) => likedPostIds.add(d.data().targetId))
      );
    }

    posts = posts.map((p) => ({ ...p, isLiked: likedPostIds.has(p?.id) }));

    return {
      posts,
      pagination: {
        hasNextPage: !!nextCursor,
        nextCursor,
      },
    };
  }

  let postsRef: FirebaseFirestore.Query = db
    .collection(COLLECTIONS.POSTS)
    .where("status", "==", "active");

  if (sortBy === "my_posts") {
    postsRef = postsRef.where("uid", "==", uid);
  } else {
    postsRef = postsRef.where("visibility", "==", "public");
  }

  if (category) {
    postsRef = postsRef.where("category", "==", category);
  }

  if (sortBy === "trending") {
    const trendingDate = new Date();
    trendingDate.setDate(trendingDate.getDate() - trendingDays);

    const trendingSnap = await postsRef
      .where("updatedAt", ">=", trendingDate.toISOString())
      .orderBy("updatedAt", "desc")
      .get();

    posts = trendingSnap.docs.map((doc) => {
      const data = doc.data();
      const likeCount = data.likeCount || 0;
      const commentCount = data.commentCount || 0;
      const score = likeCount * 2 + commentCount * 3;
      return { id: doc.id, ...data, trendingScore: score };
    });

    posts.sort((a, b) => b.trendingScore - a.trendingScore);

    let startIndex = 0;
    if (cursor) {
      const idx = posts.findIndex((p) => p.id === cursor);
      if (idx !== -1) startIndex = idx + 1;
    }

    const paginated = posts.slice(startIndex, startIndex + limit);
    const nextCursor =
      paginated.length === limit ? paginated[paginated.length - 1].id : null;

    const likedPostIds = new Set<string>();
    if (paginated.length) {
      const likeChunks: string[][] = [];
      for (let i = 0; i < paginated.length; i += 10) {
        likeChunks.push(paginated.slice(i, i + 10).map((p) => p.id));
      }

      const likesSnaps = await Promise.all(
        likeChunks.map((chunk) =>
          db
            .collection(COLLECTIONS.LIKES)
            .where("uid", "==", uid)
            .where("targetId", "in", chunk)
            .where("targetType", "==", "post")
            .get()
        )
      );

      likesSnaps.forEach((snap) =>
        snap.docs.forEach((d) => likedPostIds.add(d.data().targetId))
      );
    }

    const enriched = paginated.map((p) => ({
      ...p,
      isLiked: likedPostIds.has(p.id),
    }));

    return {
      posts: enriched,
      pagination: {
        hasNextPage: !!nextCursor,
        nextCursor,
      },
    };
  }

  postsRef = postsRef.orderBy("updatedAt", "desc");

  if (cursor) {
    const cursorDoc = await db.collection(COLLECTIONS.POSTS).doc(cursor).get();
    if (cursorDoc.exists) {
      postsRef = postsRef.startAfter(cursorDoc);
    }
  }

  const postsSnap = await postsRef.limit(limit + 1).get();
  posts = postsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const lastVisibleDoc =
    postsSnap.docs.length > limit ? postsSnap.docs[limit - 1] : null;
  const paginated = posts.slice(0, limit);

  posts = query ? searchByRelevancy(paginated, query) : paginated;

  if (sortBy !== "my_posts") {
    const [hiddenSnap, removedSnap, blockedSnap] = await Promise.all([
      db
        .collection(COLLECTIONS.HIDDEN_ITEMS)
        .where("uid", "==", uid)
        .where("target", "==", "post")
        .get(),
      db.collection(COLLECTIONS.REMOVED_POSTS).where("uid", "==", uid).get(),
      db.collection(COLLECTIONS.BLOCKED_USERS).where("uid", "==", uid).get(),
    ]);

    const hiddenIds = hiddenSnap.docs.map((d) => d.data().itemId);
    const removedIds = removedSnap.docs.map((d) => d.data().postId);
    const blockedUserIds = blockedSnap.docs.map((d) => d.data().blockedUid);

    posts = posts.filter(
      (p) =>
        !hiddenIds.includes(p.id) &&
        !removedIds.includes(p.id) &&
        !blockedUserIds.includes(p.uid)
    );
  }

  const postIds = posts.map((p) => p.id);
  const likedPostIds = new Set<string>();
  if (postIds.length) {
    const likeChunks: string[][] = [];
    for (let i = 0; i < postIds.length; i += 10) {
      likeChunks.push(postIds.slice(i, i + 10));
    }

    const likesSnaps = await Promise.all(
      likeChunks.map((chunk) =>
        db
          .collection(COLLECTIONS.LIKES)
          .where("uid", "==", uid)
          .where("targetId", "in", chunk)
          .where("targetType", "==", "post")
          .get()
      )
    );

    likesSnaps.forEach((snap) =>
      snap.docs.forEach((d) => likedPostIds.add(d.data().targetId))
    );
  }

  posts = posts.map((p) => ({ ...p, isLiked: likedPostIds.has(p.id) }));

  return {
    posts,
    pagination: {
      hasNextPage: !!lastVisibleDoc,
      nextCursor: lastVisibleDoc ? lastVisibleDoc.id : null,
    },
  };
};

export const GetPostByIdService = async (
  uid: string,
  postId: string
): Promise<Post> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const postData = postDoc.data() as Post;

  if (!postData || postData.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  if (postData.visibility === "private" && postData.uid !== uid) {
    throw new ApiError(
      JOURNAL_ERRORS.FORBIDDEN.statusCode,
      JOURNAL_ERRORS.FORBIDDEN.message
    );
  }

  const [hiddenSnap, removedSnap, blockedSnap] = await Promise.all([
    db
      .collection(COLLECTIONS.HIDDEN_ITEMS)
      .where("uid", "==", uid)
      .where("itemId", "==", postId)
      .limit(1)
      .get(),
    db
      .collection(COLLECTIONS.REMOVED_POSTS)
      .where("uid", "==", uid)
      .where("postId", "==", postId)
      .limit(1)
      .get(),
    db
      .collection(COLLECTIONS.BLOCKED_USERS)
      .where("uid", "==", uid)
      .where("blockedUid", "==", postData.uid)
      .limit(1)
      .get(),
  ]);

  if (!hiddenSnap.empty || !removedSnap.empty || !blockedSnap.empty) {
    throw new ApiError(
      JOURNAL_ERRORS.FORBIDDEN.statusCode,
      "You cannot access this post."
    );
  }

  const likeSnap = await db
    .collection(COLLECTIONS.LIKES)
    .where("uid", "==", uid)
    .where("targetId", "==", postId)
    .where("targetType", "==", "post")
    .limit(1)
    .get();

  const isLiked = !likeSnap.empty;

  return {
    id: postDoc.id,
    ...postData,
    isLiked,
  } as Post;
};

export const UpdatePostService = async (
  uid: string,
  postId: string,
  heading?: string,
  content?: string,
  visibility?: "private" | "public",
  category?: "pregnancy" | "fertility_challenges" | "miscarriage" | "abortion"
): Promise<Post> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const postData = postDoc.data() as Post;

  if (!postData || postData.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  if (postData.uid !== uid) {
    throw new ApiError(
      JOURNAL_ERRORS.FORBIDDEN.statusCode,
      JOURNAL_ERRORS.FORBIDDEN.message
    );
  }

  const dataToUpdate: Partial<Post> = {};
  if (heading !== undefined) dataToUpdate.heading = heading;
  if (content !== undefined) dataToUpdate.content = content;
  if (visibility !== undefined) dataToUpdate.visibility = visibility;
  if (category !== undefined) dataToUpdate.category = category;

  if (Object.keys(dataToUpdate).length === 0) {
    throw new ApiError(JOURNAL_ERRORS.NOT_FOUND.statusCode, JOURNAL_ERRORS.NOT_FOUND.message);
  }

  dataToUpdate.updatedAt = new Date().toISOString();

  await postRef.update(dataToUpdate);

  const updatedDoc = await postRef.get();
  return { id: updatedDoc.id, ...(updatedDoc.data() as Post) };
};

export const HidePostService = async (
  uid: string,
  postId: string
): Promise<{ message: string; id: string }> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const hiddenRef = db
    .collection(COLLECTIONS.HIDDEN_ITEMS)
    .doc(`${uid}_${postId}`);

  const [postDoc, hiddenDoc] = await Promise.all([
    postRef.get(),
    hiddenRef.get(),
  ]);

  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  let message = "";

  if (hiddenDoc.exists) {
    await hiddenRef.delete();
    message = "Post unhidden successfully";
  } else {
    const now = new Date().toISOString();
    await hiddenRef.set({
      uid,
      itemId: postId,
      target: "post",
      createdAt: now,
      updatedAt: now,
    });
    message = "Post hidden successfully";
  }

  return { id: postId, message };
};

export const BookmarkPostService = async (
  uid: string,
  postId: string
): Promise<{ message: string; id: string }> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const bookmarkRef = db
    .collection(COLLECTIONS.BOOKMARKS)
    .doc(`${uid}_${postId}`);

  const [postDoc, bookmarkDoc] = await Promise.all([
    postRef.get(),
    bookmarkRef.get(),
  ]);

  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  let message = "";
  const now = new Date().toISOString();

  if (bookmarkDoc.exists) {
    await bookmarkRef.delete();
    message = "Post removed from bookmarks successfully";
  } else {
    await bookmarkRef.set({
      uid,
      postId,
      createdAt: now,
      updatedAt: now,
    });
    message = "Post bookmarked successfully";
  }

  return { id: postId, message };
};

export const RemovePostService = async (
  uid: string,
  postId: string
): Promise<{ id: string; message: string }> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const removedRef = db
    .collection(COLLECTIONS.REMOVED_POSTS)
    .doc(`${uid}_${postId}`);

  const [postDoc, removedDoc] = await Promise.all([
    postRef.get(),
    removedRef.get(),
  ]);

  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const postData = postDoc.data() as Post;
  const now = new Date().toISOString();
  let message = "";

  if (postData.uid === uid) {
    if (postData.status === "removed") {
      throw new ApiError(
        JOURNAL_ERRORS.POST_REMOVED.statusCode,
        JOURNAL_ERRORS.POST_REMOVED.message
      );
    }
    await postRef.update({ status: "removed", removedAt: now });
    message = "Post deleted successfully";
  } else {
    if (removedDoc.exists) {
      message = "Post removed already";
    } else {
      await removedRef.set({
        uid,
        postId,
        createdAt: now,
        updatedAt: now,
      });
      message = "Post removed successfully";
    }
  }

  return { id: postId, message };
};

export const LikePostService = async (
  uid: string,
  postId: string
): Promise<{ message: string; id: string }> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const likeRef = db.collection(COLLECTIONS.LIKES).doc(`${uid}_${postId}`);

  const [postDoc, likeDoc] = await Promise.all([postRef.get(), likeRef.get()]);

  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const batch = db.batch();
  const now = new Date().toISOString();
  let message = "";

  if (likeDoc.exists) {
    batch.delete(likeRef);
    batch.update(postRef, { likeCount: FieldValue.increment(-1) });
    message = "Post unliked successfully";
  } else {
    batch.set(likeRef, {
      uid,
      targetType: "post",
      targetId: postId,
      createdAt: now,
      updatedAt: now,
    });
    batch.update(postRef, { likeCount: FieldValue.increment(1) });
    message = "Post liked successfully";
  }

  await batch.commit();

  return { id: postId, message };
};

export const CreateCommentService = async (
  uid: string,
  postId: string,
  text: string
): Promise<Partial<Comment>> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const postDoc = await postRef.get();
  const postData = postDoc.data();

  if (!postDoc.exists || !postData || postData.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const commentRef = db.collection(COLLECTIONS.COMMENTS).doc();
  const now = new Date().toISOString();

  const commentData: Comment = {
    postId,
    uid,
    text,
    likeCount: 0,
    replyCount: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(commentRef, commentData);
  batch.update(postRef, {
    commentCount: FieldValue.increment(1),
  });

  await batch.commit();

  return { id: commentRef.id, ...commentData };
};

export const HideCommentService = async (
  uid: string,
  postId: string,
  commentId: string
): Promise<{ message: string; id: string }> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);
  const hiddenRef = db
    .collection(COLLECTIONS.HIDDEN_ITEMS)
    .doc(`${uid}_${commentId}`);

  const [postDoc, commentDoc, hiddenDoc] = await Promise.all([
    postRef.get(),
    commentRef.get(),
    hiddenRef.get(),
  ]);

  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const commentData = commentDoc.data();
  if (
    !commentDoc.exists ||
    commentData?.status !== "active" ||
    commentData?.postId !== postId
  ) {
    throw new ApiError(
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.message
    );
  }

  const batch = db.batch();
  const now = new Date().toISOString();
  const isHidden = hiddenDoc.exists;

  if (isHidden) {
    batch.delete(hiddenRef);
  } else {
    batch.set(hiddenRef, {
      uid,
      itemId: commentId,
      target: "comment",
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();

  return {
    id: commentId,
    message: isHidden
      ? "Comment unhidden successfully"
      : "Comment hidden successfully",
  };
};

export const GetCommentsService = async (
  postId: string,
  uid: string,
  limit = 10,
  cursor?: string
) => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);

  const [postDoc, hiddenCommentsSnap, blockedUsersSnap] = await Promise.all([
    postRef.get(),
    db
      .collection(COLLECTIONS.HIDDEN_ITEMS)
      .where("uid", "==", uid)
      .where("target", "==", "comment")
      .get(),
    db.collection(COLLECTIONS.BLOCKED_USERS).where("uid", "==", uid).get(),
  ]);

  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  let commentsRef: FirebaseFirestore.Query = db
    .collection(COLLECTIONS.COMMENTS)
    .where("postId", "==", postId)
    .where("status", "==", "active")
    .orderBy("updatedAt", "desc");

  if (cursor) {
    const cursorDoc = await db.collection(COLLECTIONS.COMMENTS).doc(cursor).get();
    if (cursorDoc.exists) commentsRef = commentsRef.startAfter(cursorDoc);
  }

  const commentsSnap = await commentsRef.limit(limit + 1).get();

  if (commentsSnap.empty) {
    return { comments: [], pagination: { hasNextPage: false, nextCursor: null } };
  }

  const hiddenCommentIds = hiddenCommentsSnap.docs.map((d) => d.data().itemId);
  const blockedUserIds = blockedUsersSnap.docs.map((d) => d.data().blockedUid);

  let comments = commentsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Comment))
    .filter((c) => !hiddenCommentIds.includes(c.id) && !blockedUserIds.includes(c.uid));

  let likedCommentIds = new Set<string>();

  if (comments.length) {
    const likedComments = await fetchInChunks<Like>(
      db.collection(COLLECTIONS.LIKES),
      "targetId",
      comments.map((c:any) => c.id),
      [(ref) => ref.where("uid", "==", uid).where("targetType", "==", "comment")]
    );
    likedCommentIds = new Set(likedComments.map((like) => like.targetId));
  }

  comments = comments.map((c:any) => ({ ...c, isLiked: likedCommentIds.has(c.id) }));

  const hasNextPage = commentsSnap.docs.length > limit;
  const paginated = comments.slice(0, limit);
  const nextCursor = hasNextPage ? paginated[paginated.length - 1].id : null;

  return { comments: paginated, pagination: { hasNextPage, nextCursor } };
};

export const GetCommentByIdService = async (
  postId: string,
  commentId: string,
  uid?: string
) => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);

  const [postDoc, commentDoc] = await Promise.all([
    postRef.get(),
    commentRef.get(),
  ]);

  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const commentData = commentDoc.data() as Comment;
  if (!commentDoc.exists || !commentData || commentData.postId !== postId) {
    throw new ApiError(
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.message
    );
  }

  let isLiked = false;
  if (uid) {
    const likeSnap = await db
      .collection(COLLECTIONS.LIKES)
      .doc(`${uid}_${commentId}`)
      .get();
    isLiked = likeSnap.exists;
  }

  return { id: commentDoc.id, ...commentData, isLiked } as Comment & {
    isLiked?: boolean;
  };
};

export const UpdateCommentService = async (
  uid: string,
  postId: string,
  commentId: string,
  text?: string
): Promise<Partial<Comment>> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);

  const [postDoc, commentDoc] = await Promise.all([
    postRef.get(),
    commentRef.get(),
  ]);

  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const commentData = commentDoc.data() as Comment;
  if (!commentData || commentData.postId !== postId) {
    throw new ApiError(
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.message
    );
  }

  if (commentData.uid !== uid) {
    throw new ApiError(
      JOURNAL_ERRORS.FORBIDDEN.statusCode,
      JOURNAL_ERRORS.FORBIDDEN.message
    );
  }

  if (!text) {
    return { id: commentId };
  }

  const updatedData: Partial<Comment> = {
    text,
    updatedAt: new Date().toISOString(),
  };

  await commentRef.update(updatedData);

  return { id: commentId, ...updatedData };
};

export const LikeCommentService = async (
  uid: string,
  postId: string,
  commentId: string
): Promise<{ message: string; id: string }> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);
  const likeRef = db.collection(COLLECTIONS.LIKES).doc(`${uid}_${commentId}`);

  const [postDoc, commentDoc, likeDoc] = await Promise.all([
    postRef.get(),
    commentRef.get(),
    likeRef.get(),
  ]);

  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const commentData = commentDoc.data() as Comment;
  if (
    !commentDoc.exists ||
    !commentData ||
    commentData.status !== "active" ||
    commentData.postId !== postId
  ) {
    throw new ApiError(
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.message
    );
  }

  const batch = db.batch();
  const now = new Date().toISOString();
  let message = "";

  if (likeDoc.exists) {
    batch.delete(likeRef);
    batch.update(commentRef, {
      likeCount: FieldValue.increment(-1),
      updatedAt: now,
    });
    message = "Comment unliked successfully";
  } else {
    batch.set(likeRef, {
      uid,
      targetType: "comment",
      targetId: commentId,
      createdAt: now,
      updatedAt: now,
    });
    batch.update(commentRef, {
      likeCount: FieldValue.increment(1),
      updatedAt: now,
    });
    message = "Comment liked successfully";
  }

  await batch.commit();

  return { id: commentId, message };
};

export const CreateReplyService = async (
  uid: string,
  postId: string,
  commentId: string,
  text: string
): Promise<Reply> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);

  const [postDoc, commentDoc] = await Promise.all([
    postRef.get(),
    commentRef.get(),
  ]);

  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const commentData = commentDoc.data() as Comment;
  if (!commentDoc.exists || !commentData || commentData.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.message
    );
  }

  const replyRef = db.collection(COLLECTIONS.REPLIES).doc();
  const batch = db.batch();
  const now = new Date().toISOString();

  const replyData: Reply = {
    commentId,
    uid,
    postId,
    text,
    likeCount: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  batch.set(replyRef, replyData);
  batch.update(commentRef, {
    replyCount: FieldValue.increment(1),
    updatedAt: now,
  });

  await batch.commit();

  return { id: replyRef.id, ...replyData };
};

export const GetRepliesService = async (
  uid: string,
  postId: string,
  commentId: string,
  limit = 10,
  cursor?: string
) => {
  const [hiddenRepliesSnap, blockedUsersSnap] = await Promise.all([
    db
      .collection(COLLECTIONS.HIDDEN_ITEMS)
      .where("uid", "==", uid)
      .where("target", "==", "reply")
      .get(),
    db.collection(COLLECTIONS.BLOCKED_USERS).where("uid", "==", uid).get(),
  ]);

  const hiddenReplyIds = hiddenRepliesSnap.docs.map((d) => d.data().itemId);
  const blockedUserIds = blockedUsersSnap.docs.map((d) => d.data().blockedUid);

  let repliesRef: FirebaseFirestore.Query = db
    .collection(COLLECTIONS.REPLIES)
    .where("postId", "==", postId)
    .where("commentId", "==", commentId)
    .where("status", "==", "active")
    .orderBy("updatedAt", "desc");

  if (cursor) {
    const cursorDoc = await db
      .collection(COLLECTIONS.REPLIES)
      .doc(cursor)
      .get();
    if (cursorDoc.exists) repliesRef = repliesRef.startAfter(cursorDoc);
  }

  const repliesSnap = await repliesRef.limit(limit + 1).get();

  if (repliesSnap.empty) {
    return {
      replies: [],
      pagination: { hasNextPage: false, nextCursor: null },
    };
  }

  let replies = repliesSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Reply))
    .filter(
      (r) => !hiddenReplyIds.includes(r.id) && !blockedUserIds.includes(r.uid)
    );

  const likedReplies = await fetchInChunks<Like>(
    db.collection(COLLECTIONS.LIKES),
    "targetId",
    replies.map((r: any) => r.id),
    [(ref) => ref.where("uid", "==", uid).where("targetType", "==", "reply")]
  );

  const likedReplyIds = new Set(likedReplies.map((like) => like.targetId));

  replies = replies.map((r: any) => ({
    ...r,
    isLiked: likedReplyIds.has(r.id),
  }));

  const hasNextPage = repliesSnap.docs.length > limit;
  const paginated = replies.slice(0, limit);
  const nextCursor = hasNextPage ? paginated[paginated.length - 1].id : null;

  return { replies: paginated, pagination: { hasNextPage, nextCursor } };
};

export const GetReplyByIdService = async (
  postId: string,
  commentId: string,
  replyId: string
): Promise<Reply> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);
  const replyRef = db.collection(COLLECTIONS.REPLIES).doc(replyId);

  const [postDoc, commentDoc, replyDoc] = await Promise.all([
    postRef.get(),
    commentRef.get(),
    replyRef.get(),
  ]);

  const postData = postDoc.data();
  if (!postDoc.exists || postData?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const commentData = commentDoc.data();
  if (
    !commentDoc.exists ||
    !commentData ||
    commentData.status !== "active" ||
    commentData.postId !== postId
  ) {
    throw new ApiError(
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.message
    );
  }

  const replyData = replyDoc.data();
  if (
    !replyDoc.exists ||
    !replyData ||
    replyData.status !== "active" ||
    replyData.commentId !== commentId
  ) {
    throw new ApiError(
      JOURNAL_ERRORS.REPLY_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.REPLY_NOT_FOUND.message
    );
  }

  return { id: replyDoc.id, ...replyData } as Reply;
};

export const UpdateReplyService = async (
  uid: string,
  postId: string,
  commentId: string,
  replyId: string,
  text?: string
): Promise<Partial<Reply>> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);
  const replyRef = db.collection(COLLECTIONS.REPLIES).doc(replyId);

  const [postDoc, commentDoc, replyDoc] = await Promise.all([
    postRef.get(),
    commentRef.get(),
    replyRef.get(),
  ]);

  const postData = postDoc.data();
  if (!postDoc.exists || postData?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const commentData = commentDoc.data();
  if (
    !commentDoc.exists ||
    !commentData ||
    commentData.status !== "active" ||
    commentData.postId !== postId
  ) {
    throw new ApiError(
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.message
    );
  }

  const replyData = replyDoc.data();
  if (
    !replyData ||
    replyData.uid !== uid ||
    replyData.commentId !== commentId
  ) {
    throw new ApiError(
      JOURNAL_ERRORS.FORBIDDEN.statusCode,
      JOURNAL_ERRORS.FORBIDDEN.message
    );
  }

  const dataToUpdate: Partial<Reply> = { updatedAt: new Date().toISOString() };
  if (text) dataToUpdate.text = text;

  await replyRef.update(dataToUpdate);
  return { id: replyId, ...dataToUpdate };
};

export const HideReplyService = async (
  uid: string,
  postId: string,
  commentId: string,
  replyId: string
): Promise<{ message: string; id: string }> => {
  const postRef = db.collection(COLLECTIONS.POSTS).doc(postId);
  const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);
  const replyRef = db.collection(COLLECTIONS.REPLIES).doc(replyId);
  const hiddenRef = db
    .collection(COLLECTIONS.HIDDEN_ITEMS)
    .doc(`${uid}_${replyId}`);

  const [postDoc, commentDoc, replyDoc, hiddenDoc] = await Promise.all([
    postRef.get(),
    commentRef.get(),
    replyRef.get(),
    hiddenRef.get(),
  ]);

  if (!postDoc.exists || postDoc.data()?.status !== "active") {
    throw new ApiError(
      JOURNAL_ERRORS.POST_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.POST_NOT_FOUND.message
    );
  }

  const commentData = commentDoc.data();
  if (
    !commentDoc.exists ||
    !commentData ||
    commentData.status !== "active" ||
    commentData.postId !== postId
  ) {
    throw new ApiError(
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.COMMENT_NOT_FOUND.message
    );
  }

  const replyData = replyDoc.data();
  if (
    !replyDoc.exists ||
    !replyData ||
    replyData.status !== "active" ||
    replyData.commentId !== commentId
  ) {
    throw new ApiError(
      JOURNAL_ERRORS.REPLY_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.REPLY_NOT_FOUND.message
    );
  }

  const batch = db.batch();
  let message = "";

  if (hiddenDoc.exists) {
    batch.delete(hiddenRef);
    message = "Reply unhidden successfully";
  } else {
    batch.set(hiddenRef, {
      uid,
      itemId: replyId,
      target: "reply",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    message = "Reply hidden successfully";
  }

  await batch.commit();
  return { id: replyId, message };
};

export const LikeReplyService = async (
  uid: string,
  postId: string,
  commentId: string,
  replyId: string
): Promise<{ message: string; id: string }> => {
  const replyRef = db.collection(COLLECTIONS.REPLIES).doc(replyId);
  const likeRef = db.collection(COLLECTIONS.LIKES).doc(`${uid}_${replyId}`);

  const [replyDoc, likeDoc] = await Promise.all([
    replyRef.get(),
    likeRef.get(),
  ]);
  const replyData = replyDoc.data();

  if (
    !replyDoc.exists ||
    !replyData ||
    replyData.status !== "active" ||
    replyData.commentId !== commentId ||
    replyData.postId !== postId
  ) {
    throw new ApiError(
      JOURNAL_ERRORS.REPLY_NOT_FOUND.statusCode,
      JOURNAL_ERRORS.REPLY_NOT_FOUND.message
    );
  }

  const batch = db.batch();
  let message = "";

  if (likeDoc.exists) {
    batch.delete(likeRef);
    batch.update(replyRef, {
      likeCount: FieldValue.increment(-1),
      updatedAt: new Date().toISOString(),
    });
    message = "Reply unliked successfully";
  } else {
    batch.set(likeRef, {
      uid,
      targetType: "reply",
      targetId: replyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    batch.update(replyRef, {
      likeCount: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    });
    message = "Reply liked successfully";
  }

  await batch.commit();
  return { id: replyId, message };
};
