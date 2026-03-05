export interface Subscription {
  id: number;
  user_id: number;
  name: string;
  amount: number;
  currency: string;
  cycle: "monthly" | "yearly" | "weekly" | "quarterly";
  category: string;
  icon?: string;
  color: string;
  next_date?: string;
  member: string;
  notes?: string;
  trial: boolean;
  active: boolean;
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  sub_id?: number;
  message: string;
  read: boolean;
  created_at: string;
  sub?: Subscription;
}

export interface UserSettings {
  user_id: number;
  currency: string;
  theme: string;
  remind_3d: boolean;
  remind_7d: boolean;
  remind_14d: boolean;
}

export const CATEGORIES = [
  "Entertainment", "Music", "Software", "Storage", "Productivity",
  "Health", "News", "Gaming", "Education", "Utilities", "Other"
];

export const CYCLES = ["monthly", "yearly", "weekly", "quarterly"] as const;

export const CAT_COLORS: Record<string, string> = {
  Entertainment: "#8B5CF6", Music: "#10B981", Software: "#3B82F6",
  Storage: "#F59E0B", Productivity: "#6366F1", Health: "#EF4444",
  News: "#64748B", Gaming: "#F97316", Education: "#14B8A6",
  Utilities: "#84CC16", Other: "#94A3B8"
};

export function toMonthly(amount: number, cycle: string): number {
  if (cycle === "monthly") return amount;
  if (cycle === "yearly") return amount / 12;
  if (cycle === "weekly") return amount * 4.33;
  if (cycle === "quarterly") return amount / 3;
  return amount;
}

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function fmt(n: number): string {
  return n.toFixed(2);
}
