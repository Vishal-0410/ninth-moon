export interface SupportTicket {
  id?: string;
  uid: string;
  name: string;
  email: string;
  location: string;
  subject:
    | "Feedback"
    | "Technical issue"
    | "Account/billing"
    | "Partnership/Media"
    | "Other";
  message: string;
  messageReply?: string;
  tat?: number;
  status: "Open" | "In Progress" | "Closed" | "Reopen";
  priority?: "Low" | "Medium" | "High";
  internalMessages?: string[] ;
  repliedBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
