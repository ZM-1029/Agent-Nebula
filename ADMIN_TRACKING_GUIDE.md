# Agent Chat Handling — Admin Tracking & Oversight Guide

**Platform:** Frankie (Agent Nebula frontend) + Furdeco‑ChatBot (.NET backend)
**Audience:** Supervisors / Admins
**Purpose:** How an admin monitors live chat handling, holds agents accountable, and measures
performance — and a verification that each capability is implemented across the **customer**,
**agent**, and **admin** surfaces.

---

## 1. Tracking philosophy

Admin oversight is built on three layers:

1. **Real‑time visibility** — see every live conversation, the queue, and who is/ isn't working *right now*.
2. **Accountability** — automatically surface agents who are free while customers wait, or who don't respond in time.
3. **Historical measurement** — per‑agent performance, customer ratings, and SLA outcomes over time.

Everything below is wired end‑to‑end (customer widget → backend → agent app → admin console),
so the numbers an admin sees reflect real activity, not mock data.

---

## 2. Real‑time visibility (Admin → Live Chats)

### 2.1 Team Health Strip (top of the page)
A live row of tiles, refreshed via SignalR + a 15s poll:

| Tile | Meaning | Highlights |
|---|---|---|
| **Waiting** | Customers currently in the queue | amber when > 0 |
| **Longest wait** | Oldest waiting customer (minutes) | red past the SLA threshold (5 min) |
| **SLA breaches** | Queued customers past the threshold | red when > 0 |
| **Online** | Agents marked available | — |
| **In chats** | Agents handling ≥ 1 chat | — |
| **Idle** | Online agents handling **zero** chats | red when customers are waiting |

> **One glance = whole‑team health.** If "Waiting" is high while "Idle" is red, capacity is being wasted.

### 2.2 Idle‑while‑waiting banner (the key accountability signal)
When one or more agents are **Online but handling no chats** *while customers are waiting*, a red
banner appears **naming those agents**:

> ⚠ **2 agents free** while 5 customers waiting — *Aditya Tripathi, Agent One*

This is the single clearest "an agent is ignoring the queue" indicator — no cross‑referencing needed.

### 2.3 Live conversation oversight
For any active session the admin can:
- **Read the transcript live** (customer + agent messages, in real time).
- See a **per‑session timer** (queued / accepted / status).
- See full **Order details** (consignment, recipient, address, delivery, status, items, tracking) captured at chat start.
- **Whisper** a private tip to the agent (customer never sees it).
- **Barge in** to take over (customer is told a supervisor joined; supervisor messages are colour‑coded).
- **End chat** directly (creates a ticket, asks the customer to rate).

---

## 3. Accountability & routing (auto‑assign)

Configurable in **Admin → Settings → Auto‑assign** (toggle + thresholds). Off by default (pull mode).

### 3.1 Pull mode (default)
Chats sit in the **Session Queue**; agents claim them via **"Accept next"** (FIFO) or **per‑row Accept**
(cherry‑pick a specific waiting customer). The Health Strip exposes anyone idling while the queue grows.

### 3.2 Auto‑assign mode (push)
- Queued chats are **pushed** to the **longest‑idle** available agent (under the concurrency cap).
- Agent must **send a first reply within the response window** (default 30s).
- **No reply in time** → if another agent can take it, the chat is **reassigned** and the slow agent is **flagged** to admins; otherwise it stays with the busy agent (no orphaning).
- After the configured **max attempts** with every agent tried → **escalated** to admins for manual pickup.
- **One pending offer per agent** — chats are fed one at a time, so nothing piles onto a single agent.

### 3.3 Settings (admin‑editable at runtime)
| Setting | Default | Range |
|---|---|---|
| Enable auto‑assign | Off | on/off |
| Max chats / agent | 5 | 1–20 |
| Response window (s) | 30 | 10–300 |
| Max attempts before escalation | 3 | 1–10 |

---

## 4. Alerts & notifications (Admin bell)

Pushed in real time and persisted; the bell badges unread counts:

| Notification | Trigger |
|---|---|
| **New Chat** | A customer joins the queue |
| **Queue‑wait breach** | A customer waits past the threshold (default 5 min) |
| **SLA breach** | A ticket passes its SLA deadline unresolved |
| **Assign timeout** | (auto‑assign) An agent didn't respond in time and the chat was reassigned |
| **Auto‑assign escalation** | No agent responded after max attempts — needs manual pickup |
| **Chat transferred** | A chat moved between agents |

A background service scans every minute and raises each alert **once** (no spam).

---

## 5. Historical performance (Admin → Analytics)

Per‑agent leaderboard table, driven by real session data:

| Column | What it tells you |
|---|---|
| **Handled / Resolved** | Volume and completion |
| **Resolution %** | Closure rate |
| **Avg first reply** | Responsiveness (time‑to‑first‑message) |
| **Avg CSAT** | Customer satisfaction (from star ratings) |

Plus workspace KPIs (volume trend, pickup time by hour) and the chatbot analytics tab.

### 5.1 Customer ratings
After every chat the customer rates 1–5 stars. Ratings surface as:
- **Avg CSAT** per agent and workspace‑wide (Analytics).
- A **star badge** on each ticket and a stars row on the ticket detail (so a 1★ chat is easy to find and follow up).

### 5.2 Tickets
Every resolved/ended chat becomes a **ticket** carrying the full transcript, the assigned agent,
the customer rating, SLA status, and order reference — a permanent audit trail of handling.

---

## 6. Implementation map (customer · agent · admin)

How each role's surface feeds the tracking system:

### Customer (chatbot widget — `Index.cshtml`)
- Single composer live chat with emoji + End Chat; typing indicators both ways.
- Captures the **order snapshot** (consignment, address, delivery, items, status) at chat start → fed to agent + admin.
- **Rates the agent** (1–5★) at the end → feeds CSAT.
- "Supervisor joined" + colour‑coded supervisor messages during a barge.

### Agent (Live Chats app)
- **Status** (Online/Busy/Away/Offline) — persists across refresh; drives the Idle/Online metrics.
- **Inbox + Session Queue** (Accept next / cherry‑pick).
- Receives **auto‑assigned** chats (auto‑opens with a "respond now" prompt); first reply = "responded".
- Sees the customer's **order details** in the profile pane.
- Activity (handled, first‑reply times, resolutions, CSAT) feeds the Analytics leaderboard.

### Admin (Admin console)
- **Live Chats**: Health Strip, idle banner, live transcripts, whisper, barge, end chat, order panel.
- **Settings → Auto‑assign**: toggle + thresholds.
- **Analytics**: per‑agent leaderboard + CSAT + KPIs.
- **Agents**: live status, active chats, last seen.
- **Tickets**: transcripts, ratings, SLA, assignee.
- **Notifications**: queue‑wait, SLA, assign‑timeout, escalation, new chat, transfer.

---

## 7. Recommended admin monitoring routine

- **Continuous (Live Chats open):** watch the Health Strip. If the **idle banner** turns red, nudge the named agents or enable auto‑assign.
- **On alert:** act on **Queue‑wait** / **Escalation** notifications immediately.
- **End of shift / daily:** review the **Analytics leaderboard** — low first‑reply or CSAT, low resolution % — and spot‑check **1★ tickets**.
- **Capacity tuning:** if the queue regularly backs up, raise staffing, the per‑agent cap, or turn on auto‑assign.

---

## 8. Implementation status checklist

| # | Capability | Status | Where |
|---|---|---|---|
| 1 | Live transcript oversight (all active chats) | ✅ | Admin → Live Chats |
| 2 | Team Health Strip (waiting / longest wait / SLA / online / in‑chats / idle) | ✅ | Admin → Live Chats |
| 3 | Idle‑while‑waiting banner (named agents) | ✅ | Admin → Live Chats |
| 4 | Whisper / Barge / End chat | ✅ | Admin → Live Chats |
| 5 | Order details panel (admin + agent) | ✅ | Live Chats / agent profile |
| 6 | Queue‑wait alerts | ✅ | Background service → admin bell |
| 7 | SLA‑breach alerts | ✅ | Background service → admin bell |
| 8 | Per‑agent performance leaderboard | ✅ | Admin → Analytics |
| 9 | Customer CSAT (ratings → badges + averages) | ✅ | Tickets / Analytics |
| 10 | Auto‑assign (round‑robin, cap, timeout, reassign, escalate) | ✅ | Settings + background engine |
| 11 | Agent status (persists across refresh) | ✅ | Agent app + profile dropdown |
| 12 | Session Queue (Accept next + cherry‑pick) | ✅ | Agent + Session Queue page |

> **Deployment note:** items relying on backend logic (auto‑assign, queue‑wait alerts, order
> snapshot on the agent endpoint, status persistence) require the **backend redeploy**; the UI
> pieces ship with the frontend build. Both are built and ready.

---

*Document generated for the Frankie / Furdeco support platform.*
