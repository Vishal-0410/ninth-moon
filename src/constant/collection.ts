export const COLLECTIONS = {
  USERS: "users",
  BLACKLIST_TOKENS: "blacklistTokens",
  MOOD_LOGS: "moodLogs",
  SYMPTOMS_LOGS: "symptomsLogs",
  CHAT_MESSAGE: "chatMessage",
  CHAT: "chat",
  BLOCKED_QUERIES: "blockedQueries",
  MODERATIONS_SETTINGS: "moderationsSettings",
  USER_NOTES: "userNotes",
  POSTS: "posts",
  COMMENTS: "comments",
  REPLIES: "replies",
  LIKES: "likes",
  BOOKMARKS: "bookMarks",
  BLOCKED_USERS:"blockedUsers",
  HIDDEN_ITEMS: "hiddenItems",
  REMOVED_POSTS: "removedPosts",
  REPORTS: "reports",
  NOTIFICATIONS: "UserNotifications",
  SUPPORT: "support",
  APP_CONFIG: "appConfig",

} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
