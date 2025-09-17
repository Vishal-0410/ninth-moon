export interface Chat{
  uid:string
  longTermSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  uid: string;
  message: string;
  response: string;
  audioFileUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationSettings {
  restricted_keywords: string[];
  exceptions: string[];
  off_topic_response: string;
  allowed_topics?: string[];
}

export interface BlockedQuery {
  uid: string;
  query: string;
  reason: string;
  timestamp: string;
}