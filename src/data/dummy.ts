export type Customer = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  online: boolean;
  tags: string[];
  ltv: string;
  joined: string;
  location: string;
  plan: "Free" | "Pro" | "Enterprise";
  orders: { id: string; item: string; total: string; date: string; status: string }[];
};

export type Message = {
  id: string;
  from: "customer" | "agent" | "ai";
  text: string;
  time: string;
};

export type Conversation = {
  id: string;
  customerId: string;
  channel: "Chat" | "WhatsApp" | "Instagram";
  subject: string;
  preview: string;
  unread: number;
  slaMinutes: number; // remaining
  priority: "Low" | "Medium" | "High" | "Urgent";
  messages: Message[];
};

const avatar = (seed: string) => `https://i.pravatar.cc/200?u=${seed}`;

export const customers: Customer[] = [
  { id: "c1", name: "Maya Lin", email: "maya@acme.io", avatar: avatar("Maya"), online: true, tags: ["VIP", "Pro"], ltv: "$4,820", joined: "Mar 2023", location: "Toronto, CA", plan: "Pro",
    orders: [
      { id: "#10421", item: "Annual Pro upgrade", total: "$240", date: "Apr 12", status: "Paid" },
      { id: "#10387", item: "Team seats ×3", total: "$108", date: "Mar 02", status: "Paid" },
    ] },
  { id: "c2", name: "Jonas Weber", email: "j.weber@northstack.de", avatar: avatar("Jonas"), online: true, tags: ["Enterprise"], ltv: "$31,200", joined: "Aug 2022", location: "Berlin, DE", plan: "Enterprise",
    orders: [{ id: "#10402", item: "Enterprise renewal", total: "$12,000", date: "Apr 18", status: "Paid" }] },
  { id: "c3", name: "Priya Raman", email: "priya.r@lumen.app", avatar: avatar("Priya"), online: false, tags: ["Trial"], ltv: "$0", joined: "May 14", location: "Bengaluru, IN", plan: "Free",
    orders: [] },
  { id: "c4", name: "Tomás García", email: "tomas@brava.mx", avatar: avatar("Tomas"), online: true, tags: ["Pro"], ltv: "$960", joined: "Jan 2024", location: "Mexico City, MX", plan: "Pro",
    orders: [{ id: "#10398", item: "Pro monthly", total: "$24", date: "Apr 09", status: "Paid" }] },
  { id: "c5", name: "Aiko Tanaka", email: "aiko@kumo.jp", avatar: avatar("Aiko"), online: false, tags: ["VIP"], ltv: "$8,140", joined: "Nov 2022", location: "Tokyo, JP", plan: "Pro",
    orders: [{ id: "#10355", item: "Add-on: Analytics", total: "$48", date: "Mar 22", status: "Paid" }] },
  { id: "c6", name: "Noah Bennett", email: "noah.b@finchly.com", avatar: avatar("Noah"), online: true, tags: ["Pro"], ltv: "$1,420", joined: "Feb 2024", location: "Austin, US", plan: "Pro", orders: [] },
  { id: "c7", name: "Léa Dubois", email: "lea@maison.fr", avatar: avatar("Lea"), online: false, tags: ["Trial"], ltv: "$0", joined: "May 19", location: "Paris, FR", plan: "Free", orders: [] },
  { id: "c8", name: "Daniel Okafor", email: "daniel@paystack.africa", avatar: avatar("Daniel"), online: true, tags: ["Enterprise"], ltv: "$22,300", joined: "Sep 2023", location: "Lagos, NG", plan: "Enterprise", orders: [] },
];

export const conversations: Conversation[] = [
  { id: "t1", customerId: "c1", channel: "Chat", subject: "Cannot export CSV from analytics", preview: "Hey team — every time I click export I get a 504…", unread: 2, slaMinutes: 12, priority: "High",
    messages: [
      { id: "m1", from: "customer", text: "Hey team — every time I click export I get a 504. Tried Chrome + Safari.", time: "14:22" },
      { id: "m2", from: "agent", text: "Hi Maya! Sorry about that. Could you tell me which report you're exporting?", time: "14:24" },
      { id: "m3", from: "customer", text: "It's the weekly engagement one. ~80k rows.", time: "14:25" },
      { id: "m4", from: "customer", text: "Pretty urgent — board meeting at 4pm 🙏", time: "14:26" },
    ] },
  { id: "t2", customerId: "c2", channel: "Chat", subject: "SSO failing on staging tenant", preview: "Our SAML response is being rejected after the last…", unread: 0, slaMinutes: 38, priority: "Urgent",
    messages: [
      { id: "m1", from: "customer", text: "Our SAML response is being rejected after the last release. Logs attached.", time: "13:58" },
      { id: "m2", from: "agent", text: "Looking at it now, Jonas. Can you confirm your IdP entity ID?", time: "14:05" },
    ] },
  { id: "t3", customerId: "c3", channel: "Chat", subject: "Trial extension request", preview: "Could I extend my trial by 7 days? Evaluating with…", unread: 1, slaMinutes: 55, priority: "Low",
    messages: [{ id: "m1", from: "customer", text: "Could I extend my trial by 7 days? Evaluating with my team.", time: "13:40" }] },
  { id: "t4", customerId: "c4", channel: "WhatsApp", subject: "Billing receipt missing VAT", preview: "Hola — necesito la factura con IVA para abril…", unread: 0, slaMinutes: 22, priority: "Medium",
    messages: [{ id: "m1", from: "customer", text: "Hola — necesito la factura con IVA para abril.", time: "13:11" }] },
  { id: "t5", customerId: "c5", channel: "Chat", subject: "Webhook signatures mismatch", preview: "We're seeing 'invalid signature' on ~3% of events…", unread: 0, slaMinutes: 47, priority: "High",
    messages: [{ id: "m1", from: "customer", text: "We're seeing 'invalid signature' on ~3% of events since yesterday.", time: "12:48" }] },
  { id: "t6", customerId: "c6", channel: "Instagram", subject: "Plan comparison question", preview: "What's the diff between Pro and Team for 5 seats?", unread: 0, slaMinutes: 90, priority: "Low",
    messages: [{ id: "m1", from: "customer", text: "What's the diff between Pro and Team for 5 seats?", time: "12:30" }] },
];

// 24h ticket flow series
export const ticketFlow24h = Array.from({ length: 25 }, (_, h) => {
  const t = h;
  const wave = Math.sin((h / 24) * Math.PI * 1.3) * 14 + 22;
  const noise = (Math.sin(h * 1.7) + Math.cos(h * 0.9)) * 3;
  const incoming = Math.max(2, Math.round(wave + noise + (h === 17 ? 8 : 0)));
  const resolved = Math.max(1, Math.round(incoming - 2 - Math.random() * 3));
  return { hour: `${String(t).padStart(2, "0")}:00`, incoming, resolved };
});

export const agents = [
  { id: "a1", name: "Maya Reyes", avatar: avatar("MayaR"), role: "Senior Agent", csat: 98, handled: 142, aht: "3m 48s" },
  { id: "a2", name: "Idris Karim", avatar: avatar("Idris"), role: "Agent", csat: 95, handled: 118, aht: "4m 12s" },
  { id: "a3", name: "Sofia Conti", avatar: avatar("Sofia"), role: "Agent", csat: 93, handled: 104, aht: "4m 32s" },
  { id: "a4", name: "Hiroshi Mori", avatar: avatar("Hiroshi"), role: "Lead", csat: 97, handled: 132, aht: "3m 58s" },
  { id: "a5", name: "Eva Lindqvist", avatar: avatar("Eva"), role: "Agent", csat: 91, handled: 88, aht: "5m 02s" },
];

export const cannedReplies = [
  "Thanks for reaching out — I'll take a look right now.",
  "Could you share a screenshot of what you're seeing?",
  "I've escalated this to our engineering team and will follow up within the hour.",
  "Your refund has been processed — please allow 3–5 business days.",
];

export const aiSuggestions = [
  "Maya, I just reproduced the 504. Our analytics export crosses a 60s timeout for 80k+ rows. I'm queuing a backgrounded export and will email you the file in ~3 minutes — well before 4pm. Anything else for the board deck?",
  "Totally hear the urgency. Sending the export via background job now and CC'ing your shared inbox. ETA 3 minutes.",
  "While that runs — would a streaming endpoint be useful long-term? I can set you up with a beta key.",
];

export const notifications = [
  { id: "n1", title: "SLA breach risk", body: "Ticket #T-2381 from Jonas Weber is 38 min from breach.", time: "2m ago", kind: "warn" as const },
  { id: "n2", title: "New 5-star CSAT", body: "Maya Lin left a 5-star review on her last chat.", time: "12m ago", kind: "good" as const },
  { id: "n3", title: "Co-pilot suggestion", body: "Frankie AI drafted 4 replies waiting for your review.", time: "20m ago", kind: "info" as const },
  { id: "n4", title: "Shift handoff", body: "Idris is starting in 15 min — 6 open chats to transfer.", time: "1h ago", kind: "info" as const },
  { id: "n5", title: "Webhook health", body: "Webhook signature errors dropped to 0.4%.", time: "3h ago", kind: "good" as const },
];

export type AgentReport = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  attended: number;
  avgPickup: string;
  avgFirstResponse: string;
  avgResponse: string;
};

export const agentReports: AgentReport[] = [
  { id: "r1", name: "Hyden",        email: "Hyden@Zylker.com",        avatar: avatar("HydenZ"),  attended: 20, avgPickup: "00:00:23", avgFirstResponse: "00:04:04", avgResponse: "00:03:26" },
  { id: "r2", name: "Marine",       email: "Marine@Zylker.com",       avatar: avatar("MarineZ"), attended: 2,  avgPickup: "00:00:40", avgFirstResponse: "00:02:00", avgResponse: "00:06:10" },
  { id: "r3", name: "Yod Agbaria",  email: "Yod.Agbaria@Zylker.com",  avatar: avatar("YodAg"),   attended: 57, avgPickup: "00:00:52", avgFirstResponse: "01:10:05", avgResponse: "01:45:26" },
  { id: "r4", name: "Amelia Park",  email: "amelia.park@Zylker.com",  avatar: avatar("AmeliaP"), attended: 41, avgPickup: "00:00:18", avgFirstResponse: "00:03:12", avgResponse: "00:04:48" },
  { id: "r5", name: "Rafael Mendes", email: "rafael.m@Zylker.com",    avatar: avatar("RafaelM"), attended: 33, avgPickup: "00:00:34", avgFirstResponse: "00:05:21", avgResponse: "00:07:02" },
  { id: "r6", name: "Chen Wei",     email: "chen.wei@Zylker.com",     avatar: avatar("ChenW"),   attended: 28, avgPickup: "00:00:29", avgFirstResponse: "00:06:44", avgResponse: "00:08:15" },
  { id: "r7", name: "Anika Sharma", email: "anika.s@Zylker.com",      avatar: avatar("AnikaS"),  attended: 49, avgPickup: "00:00:21", avgFirstResponse: "00:02:48", avgResponse: "00:03:55" },
  { id: "r8", name: "Lukas Berg",   email: "lukas.berg@Zylker.com",   avatar: avatar("LukasB"),  attended: 12, avgPickup: "00:01:08", avgFirstResponse: "00:08:30", avgResponse: "00:11:12" },
];

export type AgentScorecard = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  phone?: string;
  extn?: string;
  mobile?: string;
  language: string;
  location: string;
  departments: string[];
  channelExpert: string[];
  feedbackWidget: boolean;
  kpis: {
    openTickets: number; openDelta: string; openTrend: "up" | "down";
    closedTickets: number; closedDelta: string; closedTrend: "up" | "down";
    avgResponse: string; avgResponseDelta: string; avgResponseTrend: "up" | "down";
    avgResolution: string; avgResolutionDelta: string; avgResolutionTrend: "up" | "down";
    happiness: number; happinessDelta: string; happinessTrend: "up" | "down";
  };
  requests: { total: number; byChannel: { name: string; value: number; fill: string }[] };
  responseBars: { label: string; hours: number; display: string }[];
  responseMax: number;
  happiness: { loved: number; okey: number; bad: number };
  volume: { date: string; backlogs: number; closed: number }[];
  totals: { tickets: number; responses: number; threadsAvg: number; closedAvg: number };
};

export const agentScorecard: AgentScorecard = {
  id: "sb1",
  name: "Sienna Brooks",
  role: "Senior Support Lead",
  avatar: avatar("SiennaBrooks"),
  email: "sienna.brooks@frankie.io",
  phone: "+1 (415) 555-0142",
  extn: "204",
  mobile: "+1 (415) 555-0188",
  language: "English (United States)",
  location: "San Francisco, US",
  departments: ["Billing & Refunds", "Onboarding", "Enterprise Success"],
  channelExpert: ["Live Chat", "Chat", "WhatsApp"],
  feedbackWidget: true,
  kpis: {
    openTickets: 9, openDelta: "−3", openTrend: "down",
    closedTickets: 134, closedDelta: "+18", closedTrend: "up",
    avgResponse: "06:15", avgResponseDelta: "−1:42", avgResponseTrend: "down",
    avgResolution: "72:30", avgResolutionDelta: "−6:08", avgResolutionTrend: "down",
    happiness: 91, happinessDelta: "+2.4%", happinessTrend: "up",
  },
  requests: {
    total: 143,
    byChannel: [
      { name: "Live Chat", value: 68, fill: "#57b85c" },
      { name: "Chat", value: 41, fill: "#4BA3E3" },
      { name: "WhatsApp", value: 22, fill: "#e6aa3c" },
      { name: "Forums", value: 12, fill: "#b48cff" },
    ],
  },
  responseBars: [
    { label: "First Response Time", hours: 3.2, display: "03:12 hrs" },
    { label: "Average Response Time", hours: 6.25, display: "06:15 hrs" },
    { label: "Average Resolution Time", hours: 72.5, display: "72:30 hrs" },
  ],
  responseMax: 96,
  happiness: { loved: 118, okey: 9, bad: 7 },
  volume: [
    { date: "Mon", backlogs: 11, closed: 14 },
    { date: "Tue", backlogs: 9,  closed: 22 },
    { date: "Wed", backlogs: 13, closed: 19 },
    { date: "Thu", backlogs: 8,  closed: 26 },
    { date: "Fri", backlogs: 6,  closed: 31 },
    { date: "Sat", backlogs: 4,  closed: 12 },
    { date: "Sun", backlogs: 5,  closed: 10 },
  ],
  totals: { tickets: 143, responses: 412, threadsAvg: 2.88, closedAvg: 19.1 },
};

export type SessionMetricDay = { date: string; pickup: number; response: number; firstResponse: number };
export const sessionMetrics = {
  avgPickup: "00:00:47",
  avgResponse: "00:05:18",
  avgFirstResponse: "00:04:02",
  series: ((): SessionMetricDay[] => {
    const days = ["18 Oct","19 Oct","20 Oct","21 Oct","22 Oct","23 Oct","24 Oct","25 Oct","26 Oct","27 Oct","28 Oct","29 Oct","30 Oct","31 Oct","1 Nov","2 Nov","3 Nov","4 Nov","5 Nov","6 Nov","7 Nov","8 Nov","9 Nov","10 Nov","11 Nov","12 Nov","13 Nov","14 Nov","15 Nov","16 Nov"];
    const baseP = [12,18,9,14,22,11,8,16,19,10,24,13,17,9,12,28,15,11,19,14,8,22,180,260,42,16,11,19,13,15];
    const baseR = [40,55,30,42,68,38,28,52,60,32,75,44,58,30,38,90,48,36,60,46,28,72,400,520,140,52,38,60,42,48];
    const baseF = [28,42,22,30,50,28,20,38,46,24,58,32,44,22,28,68,36,28,46,34,20,54,300,395,105,38,28,46,32,36];
    return days.map((d,i) => ({ date: d, pickup: baseP[i], response: baseR[i], firstResponse: baseF[i] }));
  })(),
};
