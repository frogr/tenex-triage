export interface GmailThread {
  id: string;
  subject: string;
  snippet: string;
  sender: string;
  senderEmail: string;
  date: Date;
  gmailLabels: string[];
  messageCount: number;
  isRead: boolean;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  headers?: GmailHeader[];
}

export interface GmailMessage {
  id: string;
  labelIds?: string[];
  payload?: GmailMessagePart;
  internalDate?: string;
}

export interface GmailThreadResponse {
  id: string;
  snippet?: string;
  messages?: GmailMessage[];
}

export interface GmailThreadListResponse {
  threads?: Array<{ id: string }>;
  nextPageToken?: string;
}
