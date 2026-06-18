# -*- coding: utf-8 -*-
"""Generate a formatted PDF of the Admin Tracking & Oversight Guide."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, ListFlowable, ListItem, KeepTogether,
)

OUT = "Admin_Tracking_Guide.pdf"

# ── Brand palette ────────────────────────────────────────────────────────────
BRAND      = colors.HexColor("#2a8f38")
BRAND_DK   = colors.HexColor("#1c5a28")
BRAND_LT   = colors.HexColor("#e8f7ea")
INK        = colors.HexColor("#1c1c1e")
MUTED      = colors.HexColor("#6b7280")
ROSE       = colors.HexColor("#dc2626")
AMBER      = colors.HexColor("#b45309")
LINE       = colors.HexColor("#e5e7eb")
HEADBG     = colors.HexColor("#f0faf1")

styles = getSampleStyleSheet()

def S(name, **kw):
    styles.add(ParagraphStyle(name, **kw))

S("DocTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=23,
  textColor=BRAND_DK, leading=27, spaceAfter=2, alignment=TA_LEFT)
S("DocSub", fontName="Helvetica", fontSize=10.5, textColor=MUTED, leading=15, spaceAfter=2)
S("H1", fontName="Helvetica-Bold", fontSize=14.5, textColor=BRAND_DK, leading=18,
  spaceBefore=16, spaceAfter=6)
S("H2", fontName="Helvetica-Bold", fontSize=11.5, textColor=INK, leading=15,
  spaceBefore=9, spaceAfter=3)
S("Body", fontName="Helvetica", fontSize=9.7, textColor=INK, leading=14.5, spaceAfter=5)
S("BodyBullet", fontName="Helvetica", fontSize=9.7, textColor=INK, leading=14, spaceAfter=2)
S("Quote", fontName="Helvetica-Oblique", fontSize=9.5, textColor=BRAND_DK, leading=14,
  leftIndent=10, spaceBefore=2, spaceAfter=7, backColor=BRAND_LT, borderPadding=(6, 6, 6, 6))
S("Cell", fontName="Helvetica", fontSize=8.7, textColor=INK, leading=11.5)
S("CellB", fontName="Helvetica-Bold", fontSize=8.7, textColor=INK, leading=11.5)
S("CellH", fontName="Helvetica-Bold", fontSize=8.7, textColor=colors.white, leading=11.5)
S("Foot", fontName="Helvetica", fontSize=8, textColor=MUTED, leading=11)

def P(t, s="Body"):
    return Paragraph(t, styles[s])

def bullets(items, style="BodyBullet"):
    return ListFlowable(
        [ListItem(P(i, style), leftIndent=6, value="•") for i in items],
        bulletType="bullet", start="•", leftIndent=12, bulletColor=BRAND,
        spaceBefore=0, spaceAfter=6,
    )

def table(headers, rows, col_widths, header_color=BRAND):
    data = [[Paragraph(h, styles["CellH"]) for h in headers]]
    for r in rows:
        data.append([Paragraph(c, styles["CellB" if ci == 0 and len(r) > 2 else "Cell"])
                     for ci, c in enumerate(r)])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    ts = [
        ("BACKGROUND", (0, 0), (-1, 0), header_color),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
        ("LINEAFTER", (0, 0), (-2, -1), 0.4, LINE),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, HEADBG]),
    ]
    t.setStyle(TableStyle(ts))
    return t

def hr():
    return HRFlowable(width="100%", thickness=0.7, color=LINE, spaceBefore=4, spaceAfter=4)

# ── Page furniture ───────────────────────────────────────────────────────────
def on_page(canvas, doc):
    canvas.saveState()
    # top brand bar
    canvas.setFillColor(BRAND)
    canvas.rect(0, A4[1] - 8, A4[0], 8, fill=1, stroke=0)
    # footer
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18 * mm, 12 * mm, "Frankie / Furdeco — Admin Tracking & Oversight Guide")
    canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, "Page %d" % doc.page)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 15 * mm, A4[0] - 18 * mm, 15 * mm)
    canvas.restoreState()

doc = BaseDocTemplate(
    OUT, pagesize=A4,
    leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=20 * mm,
    title="Admin Tracking & Oversight Guide", author="Frankie / Furdeco",
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=on_page)])

st = []  # story
W = doc.width

# ── Cover header ─────────────────────────────────────────────────────────────
st.append(P("Agent Chat Handling", "DocTitle"))
st.append(P("Admin Tracking &amp; Oversight Guide", "DocTitle"))
st.append(Spacer(1, 4))
st.append(P("<b>Platform:</b> Frankie (Agent Nebula frontend) + Furdeco-ChatBot (.NET backend)", "DocSub"))
st.append(P("<b>Audience:</b> Supervisors / Admins", "DocSub"))
st.append(P("<b>Purpose:</b> How an admin monitors live chat handling, enforces accountability, and "
            "measures performance — verified across the customer, agent and admin surfaces.", "DocSub"))
st.append(Spacer(1, 4))
st.append(hr())

# 1
st.append(P("1 &nbsp;Tracking philosophy", "H1"))
st.append(P("Admin oversight is built on three layers:", "Body"))
st.append(bullets([
    "<b>Real-time visibility</b> — every live conversation, the queue, and who is / isn't working right now.",
    "<b>Accountability</b> — automatically surface agents who are free while customers wait, or who don't respond in time.",
    "<b>Historical measurement</b> — per-agent performance, customer ratings and SLA outcomes over time.",
]))
st.append(P("Everything below is wired end-to-end (customer widget → backend → agent app → admin "
            "console), so the figures reflect real activity, not mock data.", "Body"))

# 2
st.append(P("2 &nbsp;Real-time visibility (Admin → Live Chats)", "H1"))
st.append(P("2.1 &nbsp;Team Health Strip", "H2"))
st.append(P("A live row of tiles, refreshed via SignalR + a 15s poll:", "Body"))
st.append(table(
    ["Tile", "Meaning", "Highlights"],
    [
        ["Waiting", "Customers currently in the queue", "amber when &gt; 0"],
        ["Longest wait", "Oldest waiting customer (minutes)", "red past 5 min"],
        ["SLA breaches", "Queued customers past the threshold", "red when &gt; 0"],
        ["Online", "Agents marked available", "—"],
        ["In chats", "Agents handling &#8805; 1 chat", "—"],
        ["Idle", "Online agents handling zero chats", "red while customers wait"],
    ],
    [W * 0.22, W * 0.5, W * 0.28],
))
st.append(Spacer(1, 4))
st.append(P("<b>One glance = whole-team health.</b> High “Waiting” + red “Idle” means capacity is being wasted.", "Quote"))
st.append(P("2.2 &nbsp;Idle-while-waiting banner (key accountability signal)", "H2"))
st.append(P("When agents are <b>Online but handling no chats</b> while customers wait, a red banner "
            "appears <b>naming those agents</b>:", "Body"))
st.append(P("⚠ <b>2 agents free</b> while 5 customers waiting — Aditya Tripathi, Agent One", "Quote"))
st.append(P("2.3 &nbsp;Live conversation oversight", "H2"))
st.append(bullets([
    "Read the transcript live (customer + agent, real time).",
    "Per-session timer (queued / accepted / status).",
    "Full <b>Order details</b> — consignment, recipient, address, delivery, status, items, tracking — captured at chat start.",
    "<b>Whisper</b> a private tip; <b>Barge in</b> to take over; <b>End chat</b> (creates a ticket + rating prompt).",
]))

# 3
st.append(P("3 &nbsp;Accountability &amp; routing (auto-assign)", "H1"))
st.append(P("Configured in <b>Admin → Settings → Auto-assign</b>. Off by default (pull mode).", "Body"))
st.append(P("3.1 &nbsp;Pull mode (default)", "H2"))
st.append(P("Chats sit in the Session Queue; agents claim them via <b>Accept next</b> (FIFO) or "
            "<b>per-row Accept</b> (cherry-pick). The Health Strip exposes anyone idling while the queue grows.", "Body"))
st.append(P("3.2 &nbsp;Auto-assign mode (push)", "H2"))
st.append(bullets([
    "Queued chats are pushed to the <b>longest-idle</b> available agent (under the cap).",
    "Agent must send a <b>first reply within the response window</b> (default 30s).",
    "No reply &amp; another agent available → <b>reassigned + agent flagged</b>; otherwise it stays put (no orphaning).",
    "After <b>max attempts</b> with everyone tried → <b>escalated</b> to admins for manual pickup.",
    "<b>One pending offer per agent</b> — chats are fed one at a time, never piled on one agent.",
]))
st.append(P("3.3 &nbsp;Settings (admin-editable at runtime)", "H2"))
st.append(table(
    ["Setting", "Default", "Range"],
    [
        ["Enable auto-assign", "Off", "on / off"],
        ["Max chats / agent", "5", "1–20"],
        ["Response window (s)", "30", "10–300"],
        ["Max attempts before escalation", "3", "1–10"],
    ],
    [W * 0.5, W * 0.25, W * 0.25],
))

# 4
st.append(P("4 &nbsp;Alerts &amp; notifications (Admin bell)", "H1"))
st.append(P("Pushed in real time, persisted, and de-duplicated (raised once):", "Body"))
st.append(table(
    ["Notification", "Trigger"],
    [
        ["New Chat", "A customer joins the queue"],
        ["Queue-wait breach", "A customer waits past the threshold (default 5 min)"],
        ["SLA breach", "A ticket passes its SLA deadline unresolved"],
        ["Assign timeout", "(auto-assign) Agent didn't respond; chat reassigned"],
        ["Auto-assign escalation", "No agent responded after max attempts"],
        ["Chat transferred", "A chat moved between agents"],
    ],
    [W * 0.32, W * 0.68],
))

# 5
st.append(P("5 &nbsp;Historical performance (Admin → Analytics)", "H1"))
st.append(P("Per-agent leaderboard, driven by real session data:", "Body"))
st.append(table(
    ["Column", "What it tells you"],
    [
        ["Handled / Resolved", "Volume and completion"],
        ["Resolution %", "Closure rate"],
        ["Avg first reply", "Responsiveness (time-to-first-message)"],
        ["Avg CSAT", "Customer satisfaction (from star ratings)"],
    ],
    [W * 0.32, W * 0.68],
))
st.append(Spacer(1, 4))
st.append(P("<b>Customer ratings</b> (1–5★ after every chat) surface as Avg CSAT per agent / workspace, "
            "plus a star badge on each ticket — so a 1★ chat is easy to find and follow up. Every "
            "resolved chat becomes a <b>ticket</b> carrying the transcript, agent, rating, SLA status and order ref.", "Body"))

# 6
st.append(P("6 &nbsp;Implementation map (customer · agent · admin)", "H1"))
st.append(P("<b>Customer</b> (chatbot widget): single-composer live chat with emoji + End Chat; two-way "
            "typing; captures the order snapshot at chat start; rates the agent 1–5★; sees supervisor "
            "join + colour-coded supervisor messages on barge.", "Body"))
st.append(P("<b>Agent</b> (Live Chats app): status (persists across refresh) driving Idle/Online metrics; "
            "Inbox + Session Queue (Accept next / cherry-pick); receives auto-assigned chats (auto-opens, "
            "“respond now”); sees the customer's order details; activity feeds the leaderboard.", "Body"))
st.append(P("<b>Admin</b> (console): Live Chats (Health Strip, idle banner, transcripts, whisper, barge, "
            "end chat, order panel); Settings → Auto-assign; Analytics leaderboard + CSAT; Agents "
            "(status / active chats / last seen); Tickets; Notifications.", "Body"))

# 7
st.append(P("7 &nbsp;Recommended admin monitoring routine", "H1"))
st.append(bullets([
    "<b>Continuous</b> (Live Chats open): watch the Health Strip; if the idle banner turns red, nudge the named agents or enable auto-assign.",
    "<b>On alert</b>: act on Queue-wait / Escalation notifications immediately.",
    "<b>Daily</b>: review the Analytics leaderboard (low first-reply / CSAT / resolution %) and spot-check 1★ tickets.",
    "<b>Capacity tuning</b>: if the queue backs up, raise staffing, the per-agent cap, or enable auto-assign.",
]))

# 8
st.append(KeepTogether([
    P("8 &nbsp;Implementation status checklist", "H1"),
    table(
        ["#", "Capability", "Status", "Where"],
        [
            ["1", "Live transcript oversight (all active chats)", "Done", "Admin → Live Chats"],
            ["2", "Team Health Strip", "Done", "Admin → Live Chats"],
            ["3", "Idle-while-waiting banner (named)", "Done", "Admin → Live Chats"],
            ["4", "Whisper / Barge / End chat", "Done", "Admin → Live Chats"],
            ["5", "Order details panel (admin + agent)", "Done", "Live Chats / agent profile"],
            ["6", "Queue-wait alerts", "Done", "Background service → bell"],
            ["7", "SLA-breach alerts", "Done", "Background service → bell"],
            ["8", "Per-agent performance leaderboard", "Done", "Admin → Analytics"],
            ["9", "Customer CSAT (ratings → badges + averages)", "Done", "Tickets / Analytics"],
            ["10", "Auto-assign (round-robin, cap, timeout, escalate)", "Done", "Settings + engine"],
            ["11", "Agent status (persists across refresh)", "Done", "Agent app + profile"],
            ["12", "Session Queue (Accept next + cherry-pick)", "Done", "Agent + Session Queue"],
        ],
        [W * 0.06, W * 0.5, W * 0.13, W * 0.31],
    ),
]))
st.append(Spacer(1, 6))
st.append(P("<b>Deployment note:</b> features relying on backend logic (auto-assign, queue-wait alerts, "
            "order snapshot on the agent endpoint, status persistence) require the backend redeploy; the "
            "UI pieces ship with the frontend build. Both are built and ready.", "Quote"))
st.append(Spacer(1, 6))
st.append(hr())
st.append(P("Document generated for the Frankie / Furdeco support platform.", "Foot"))

doc.build(st)
print("WROTE", OUT)
