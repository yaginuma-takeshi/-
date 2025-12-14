export enum CaseStatus {
  LEAD = '見込み',
  NEGOTIATION = '商談中',
  CONTRACT = '契約',
  SETTLEMENT = '決済',
  CLOSED = '完了'
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // Base64 string
}

export type ReminderSetting = 'none' | '15_min' | '30_min' | '1_hour' | '1_day' | '2_days' | '1_week';

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: string;
}

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  isCompleted: boolean;
  description?: string;
  attachments?: Attachment[];
  createdAt?: string; // ISO String for sorting by registration date
  reminder?: ReminderSetting;
  comments?: Comment[];
}

export interface RealEstateCase {
  id: string;
  propertyName: string;
  address: string;
  clientPhone: string;
  purchasePrice: number; // 仕入価格
  sellingPrice: number;  // 販売価格
  lender: string;        // 借入先
  status: CaseStatus;
  tasks: Task[];
  createdAt: string;
  notes: string;
  attachments?: Attachment[];
}

export interface ConsiderationCase {
  id: string;
  propertyName: string;
  source: string;        // 情報元
  askingPrice: number;   // 希望価格
  offerPrice: number;    // 回答価格
  replyDeadline: string; // 回答期限 (YYYY-MM-DD)
  notes: string;
  createdAt: string;
}

export interface CalendarEvent {
  date: string;
  tasks: {
    taskId: string;
    caseId: string;
    caseName: string;
    title: string;
    status: CaseStatus;
    isCompleted: boolean;
    time?: string;
    hasReminder?: boolean;
  }[];
}