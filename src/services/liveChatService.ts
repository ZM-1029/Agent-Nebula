import * as signalR from "@microsoft/signalr";
import { authFetch, getJwt, API_BASE } from "./authFetch";

// ── Types ──────────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string;
  reference: string;
  customerName: string;
  issueDescription: string;
  queuedAt: string;
  position: number;
}

export interface ActiveSession {
  id: string;
  reference: string;
  customerName: string;
  status: string;
  queuedAt: string;
  acceptedAt: string | null;
  agentName: string | null;
  agentId: string | null;
  /** JSON snapshot of the looked-up order captured at chat start (or null). */
  orderSnapshot: string | null;
  /** Minutes the customer has waited for an agent reply (0 if agent replied last). */
  awaitingReplyMins?: number;
  /** Minutes since the last message from anyone (dormant-chat detection). */
  lastActivityMins?: number;
}

/** Shape of the parsed `orderSnapshot` JSON (see widget _lcOrderSnapshot). */
export interface OrderSnapshot {
  reference?: string;
  order_number?: string;
  retailer?: string;
  recipient?: string;
  address?: string;
  postcode?: string;
  status?: string;
  confirmed?: string;
  planned_date?: string;
  planned_slot?: { start?: string; end?: string } | null;
  products?: { part?: string; description?: string }[];
  services?: { service_level?: string; delivery_point?: string } | null;
  order_steps?: Record<string, string> | null;
  email?: string;
  mobile?: string;
}

export interface ChatMessage {
  senderType: string;
  senderName: string;
  content: string;
  timestamp: string;
  isWhisper?: boolean;
}

export interface SessionDetail {
  id: string;
  reference: string;
  customerName: string;
  status: string;
  agentName: string | null;
  agentId: string | null;
  queuePosition: number | null;
  messages: ChatMessage[];
}

// ── REST helpers ───────────────────────────────────────────────────────────

export const liveChatService = {
  /** Admin: full queue snapshot */
  getQueue: () => authFetch<QueueItem[]>("/api/livechat/queue"),

  /** Admin: all active sessions */
  getActiveSessions: () => authFetch<ActiveSession[]>("/api/livechat/sessions/active"),

  /** Agent: sessions assigned to a specific agent */
  getAgentSessions: (agentId: string) =>
    authFetch<ActiveSession[]>(`/api/livechat/sessions/agent/${agentId}`),

  /** Public: single session (used for chatbot restore + agent detail view) */
  getSession: (id: string) => authFetch<SessionDetail>(`/api/livechat/sessions/${id}`),
};

// ── SignalR hub connection factory ─────────────────────────────────────────

/**
 * Creates a SignalR hub connection for the live-chat hub.
 *
 * The JWT is supplied via the `access_token` query parameter so it works
 * in environments where Authorization headers cannot be set on WebSocket
 * upgrade requests.
 */
export function createLiveChatHub(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE}/hubs/livechat`, {
      accessTokenFactory: () => getJwt(),
      // Auth is carried via the access_token query param, not cookies. The backend
      // CORS policy uses a wildcard origin, which browsers reject when a request is
      // sent with credentials. Disabling credentials lets the wildcard be accepted.
      withCredentials: false,
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}

// ── Hub event name constants (keeps strings in sync with the C# hub) ───────

export const HubEvents = {
  // → Agent
  QueueUpdated: "QueueUpdated",
  SessionAssigned: "SessionAssigned",
  AgentStatusChanged: "AgentStatusChanged",
  SessionResolved: "SessionResolved",
  ChatTransferred: "ChatTransferred",
  WhisperReceived: "WhisperReceived",
  QueueEmpty: "QueueEmpty",
  ChatAlreadyTaken: "ChatAlreadyTaken",
  ChatAutoAssigned: "ChatAutoAssigned",
  ChatReassigned: "ChatReassigned",

  // → Customer
  AgentJoined: "AgentJoined",
  ChatEnded: "ChatEnded",
  AgentTyping: "AgentTyping",
  AgentStoppedTyping: "AgentStoppedTyping",
  SupervisorJoined: "SupervisorJoined",

  // → Agent / Admin (customer is typing)
  CustomerTyping: "CustomerTyping",
  CustomerStoppedTyping: "CustomerStoppedTyping",

  // → Admin
  AdminStateDump: "AdminStateDump",
  TicketCreated: "TicketCreated",

  // → Both
  MessageReceived: "MessageReceived",
} as const;

// ── Hub method name constants (→ server) ───────────────────────────────────

export const HubMethods = {
  // Shared
  RejoinSession: "RejoinSession",
  EndChat: "EndChat",

  // Agent methods
  AgentConnect: "AgentConnect",
  AcceptNextChat: "AcceptNextChat",
  AcceptChat: "AcceptChat",
  AgentSendMessage: "AgentSendMessage",
  AgentTyping: "AgentTyping",
  AgentStoppedTyping: "AgentStoppedTyping",
  ResolveChat: "ResolveChat",
  TransferChat: "TransferChat",
  UpdateStatus: "UpdateStatus",

  // Admin methods
  JoinAdminRoom: "JoinAdminRoom",
  WhisperToAgent: "WhisperToAgent",
  BargeIn: "BargeIn",
  SupervisorSendMessage: "SupervisorSendMessage",
} as const;
