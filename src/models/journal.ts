export interface Post {
  id?: string;
  uid: string;
  heading: string;
  content: string;
  category: "pregnancy" | "fertility_challenges" | "miscarriage" | "abortion";
  visibility: "private" | "public";
  likeCount: number;
  commentCount: number;
  viewCount?: number;
  status: "active" | "removed";
  removedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id?: string;  
  postId: string;
  uid: string;
  text: string;
  likeCount: number;
  replyCount: number;
  status: "active" | "removed";
  createdAt: string;
  updatedAt: string;
}

export interface Reply {
  id?: string;
  commentId: string;
  postId:string;
  uid: string;
  text: string;
  likeCount: number;
  replyCount?: number;
  status: "active" | "removed";
  createdAt: string;
  updatedAt: string;
}

export interface Like {
  id?: string;
  uid: string;
  targetType: "post" | "comment" | "reply";
  targetId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id?: string;
  postId: string;
  uid: string;
  createdAt: string;
  updatedAt: string;
}

export interface HiddenItems {
  id?: string;
  uid: string;
  itemId: string;
  target: "post" | "comment" | "reply";
  createdAt: string;
  updatedAt: string;
}

export interface RemovedPost {
  id?: string;
  uid: string;
  postId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id?: string;
  reportedBy: string;
  targetType: "post" | "comment" | "reply";
  targetId: string;
  reason?: string;
  status: "pending" | "reviewed" | "action-taken";
  createdAt: string;
  updatedAt: string;
}

export interface BlockedUser {
  id?: string;
  uid: string;
  blockedUid: string;
  createdAt: string;
  updatedAt: string;
}
