const BASE = "http://150.241.246.64:588/api/dashboard";

export interface EndpointBreakdownItem {
  endpoint: string;
  count: number;
  success: number;
  failed: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

export interface DashboardStats {
  date: string;
  totalRequests: number;
  trackLookups: number;
  ordersFound: number;
  ordersNotFound: number;
  confirmations: number;
  declines: number;
  instructions: number;
  notes: number;
  otpSent: number;
  otpVerified: number;
  otpFailed: number;
  otpSuccessRate: number;
  userInputQueries: number;
  avgResponseMs: number;
  minResponseMs: number;
  maxResponseMs: number;
  peakHour: string;
  successRate: number;
  endpointBreakdown: EndpointBreakdownItem[];
  refTypeBreakdown: { type: string; count: number }[];
  otpChannelBreakdown: { channel: string; count: number }[];
}

export interface DailyHistory {
  date: string;
  label: string;
  totalRequests: number;
  trackLookups: number;
  confirmations: number;
  declines: number;
  otpSent: number;
  successRate: number;
}

export interface HourlyData {
  hour: number;
  label: string;
  requests: number;
  tracks: number;
  avgMs: number;
}

export interface LogEntry {
  date: string;
  time: string;
  endpoint: string;
  reference: string | null;
  postcode: string | null;
  refType: string | null;
  otpChannel: string | null;
  responseMs: number;
  status: number;
  isSuccess: boolean;
  dataFound: boolean | null;
  isUserInput: boolean;
  // Order snapshot — populated on successful track calls
  orderNumber: string | null;
  recipient: string | null;
  senderCompany: string | null;
  address: string | null;
  plannedDate: string | null;
  plannedSlotStart: string | null;
  plannedSlotEnd: string | null;
  deliveryStatus: string | null;
  serviceLevel: string | null;
  deliveryPoint: string | null;
  productDescriptions: string[] | null;
}

export interface OrderDetail {
  carrierReference: string;
  orderNumber: string;
  recipient: string;
  senderCompany: string;
  address: string;
  postcode: string;
  contactMobile: string;
  contactHome: string;
  email: string;
  plannedDate: string;
  plannedSlotStart: string;
  plannedSlotEnd: string;
  status: string;
  confirmed: string;
  deliveryInstructions: string;
  orderSteps: {
    released: string;
    received: string;
    scheduled: string;
    routed: string;
    confirmed: string;
    delivered: string;
  };
  products: { description: string; part: string }[];
  serviceLevel: string;
  deliveryPoint: string;
}

// ── Generic fetch helpers ─────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ── Public API surface ────────────────────────────────────────────────────────

export const api = {
  // Dashboard
  getStats: (date?: string) => get<DashboardStats>(`/stats${date ? `?date=${date}` : ""}`),
  getHistory: (days = 7) => get<DailyHistory[]>(`/history?days=${days}`),
  getHourly: (date?: string) => get<HourlyData[]>(`/hourly${date ? `?date=${date}` : ""}`),
  getLogs: (date?: string, limit = 200) =>
    get<LogEntry[]>(`/logs?${date ? `date=${date}&` : ""}limit=${limit}`),
  getAvailableDates: () => get<string[]>("/available-dates"),
};
