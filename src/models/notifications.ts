export interface Notification {
  id?: string;
  uid: string;
  message: string;
  lastSentAt: string | null;
  type: "personal" | "appointments" | "medical";
  date: string;
  time: string;
  repeat: "never" | "hourly" | "daily" | "weekly" | "weekdays" | "weekends" | "biweekly" | "monthly";
  status: "unread" | "done" | "snoozed" | "deleted";
  snoozeCount: number;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  jobId?: string;
}

export interface NotificationJobData {
  notificationId: string;
  uid: string;
}