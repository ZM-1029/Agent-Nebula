# Timesheet — 2026-06-08

**Project:** Frankie / Furdeco support platform (Agent Nebula frontend + Furdeco-ChatBot backend)
**Developer:** _____________

> Hours are **estimates** — adjust to your actual time. Area: FE = frontend, BE = backend, Both = full-stack, Docs.

| # | Task | Description | Area | Est. hrs |
|---|------|-------------|------|----------|
| 1 | Supervisor typing during barge | Admin barge composer emits typing so the customer sees the indicator; self-echo guard | FE | 0.5 |
| 2 | Customer chatbot redesign | Interactive star rating (hover/emoji/labels) + richer message bubbles (sender name, timestamps, supervisor colour) | BE (view) | 1.0 |
| 3 | Ticket customer-rating badges | Expose `CustomerRating` on ticket APIs; colour-coded star badges on tickets list + detail | Both | 1.0 |
| 4 | Tickets — remove filter section | Removed status chips + Filters/Sort buttons; cleaned unused state/imports | FE | 0.3 |
| 5 | Customer widget stability fixes | Fixed second-chat “stuck send”, duplicate-rating guard, lingering connection cleanup | BE (view) | 1.0 |
| 6 | Supervisor “End chat” | End-chat action from the barge composer + styled confirm dialog; persisted barged state across refresh | FE | 0.8 |
| 7 | Emoji pickers | Added emoji picker to admin composer + customer widget; removed doc/paperclip icon | Both | 0.6 |
| 8 | Remove redundant Quick Actions | Dropped duplicate Whisper/Barge panel from admin Live Chats | FE | 0.2 |
| 9 | API base URL → port 550 | Repointed all API + SignalR calls; verified build | FE | 0.3 |
| 10 | Order context (snapshot) | Capture order at chat start; persist (`OrderSnapshot` + migration); show full order details on admin + agent panels (shared component) | Both | 1.5 |
| 11 | Single composer + conversational pre-chat | Merged nested live-chat box into one composer; replaced boxed name/issue form with inline bot questions | BE (view) | 1.2 |
| 12 | Agent profile details | Read-only account details in Settings; status/role/etc. in the profile dropdown | FE | 0.6 |
| 13 | Cherry-pick accept + Session Queue page | `AcceptChat` hub method; per-row Accept; repurposed Session Queue page to the live waiting list | Both | 1.0 |
| 14 | Admin team-health strip | Live tiles (Waiting / Longest wait / SLA / Awaiting reply / Inactive / Online / Active chats / Idle) + idle-while-waiting banner | Both | 1.3 |
| 15 | Queue-wait + SLA alerts | Background monitor for queue-wait breaches; SLA-breach tile; wired admin notifications | BE | 0.8 |
| 16 | Auto-assign (round-robin) | Settings entity + migration, admin settings UI, background engine (push, 30s reply window, reassign, escalate, cap, one-pending-per-agent) | Both | 3.0 |
| 17 | Auto-assign fixes | Fixed single-agent chat-piling + anti-orphan (no reassign when no alternative) | BE | 0.8 |
| 18 | Agent app robustness | Session-fetch sequence guard (no stale clobber); `ChatEnded` handler auto-closes resolved chats | FE | 0.6 |
| 19 | Agent status persistence | Status survives refresh (`AgentConnect` preserves it) + selector/profile sync | Both | 0.7 |
| 20 | Cross-session message mixing (bug) | Route `MessageReceived` by `sessionId` so chats no longer leak across sessions (FE filter + BE transfer-message fix) | Both | 0.8 |
| 21 | Notifications/dropdown contrast | Solid (opaque) background for notifications + theme/profile menus | FE | 0.3 |
| 22 | Admin Tracking & Oversight guide | Authored guide (Markdown) + generated formatted PDF | Docs | 0.8 |
| 23 | Source control | Commit & push frontend changes to `LiveChat.Branch` | — | 0.2 |

**Estimated total: ~19.9 hrs** _(split across the day / multiple sessions — trim to your booked hours)._

---

### Summary by area
- **Frontend:** ~7.5 hrs
- **Backend:** ~6.5 hrs
- **Full-stack / shared:** ~4.5 hrs
- **Docs:** ~0.8 hr
- **Source control:** ~0.2 hr

### Notable deliverables
- Auto-assign / round-robin routing engine (new), with admin settings.
- Manager oversight: team-health strip, idle/awaiting/inactive signals, queue-wait alerts.
- Order context surfaced to agents + admins.
- Multiple production bug fixes (chat mixing, second-chat stuck, duplicate rating, status reset, message-clobber race).
- Admin Tracking & Oversight guide (MD + PDF).
</content>
