"use client";

import { useState } from "react";

const COLORS = {
  bg: "#0A0A0A",
  surface: "#111111",
  surfaceHover: "#1A1A1A",
  border: "#222222",
  borderActive: "#444444",
  text: "#FFFFFF",
  textMuted: "#999999",
  textDim: "#666666",
  accent: "#10B981",
  accentDim: "#064E3B",
  warning: "#F59E0B",
  warningDim: "#78350F",
  info: "#3B82F6",
  infoDim: "#1E3A5A",
  purple: "#8B5CF6",
  purpleDim: "#3B1F7A",
  pink: "#EC4899",
  pinkDim: "#701A3E",
};

const models = [
  {
    name: "User",
    icon: "👤",
    color: COLORS.accent,
    colorDim: COLORS.accentDim,
    tagline: "You. The person triaging their inbox.",
    description:
      "User is the root of the entire data model — every other table points back here. When you sign in with Google, NextAuth creates a User record and links it to an Account (your OAuth tokens) and a Session (your login). From there, everything you do creates data owned by your User: syncing emails creates EmailThreads, building categories creates Buckets, running the AI creates ClassificationRuns, and each Gmail sync logs a SyncEvent. If your User is deleted, every related record cascades with it — clean teardown, no orphaned data.",
    fields: [
      { name: "id", type: "cuid", note: "Primary key — auto-generated unique ID" },
      { name: "name", type: "string?", note: "Display name from Google profile" },
      { name: "email", type: "string?", note: "Unique — used for login identity" },
      { name: "emailVerified", type: "DateTime?", note: "When email was confirmed" },
      { name: "image", type: "string?", note: "Google avatar URL for the UI" },
    ],
    relations: [
      "Account — Google OAuth credentials (1:many)",
      "Session — Active login sessions (1:many)",
      "Bucket — Custom email categories (1:many, cascade delete)",
      "EmailThread — All synced Gmail threads (1:many, cascade delete)",
      "ClassificationRun — AI audit trail (1:many, cascade delete)",
      "SyncEvent — Gmail sync history (1:many, cascade delete)",
    ],
  },
  {
    name: "EmailThread",
    icon: "✉️",
    color: COLORS.info,
    colorDim: COLORS.infoDim,
    tagline: "A Gmail conversation, stored locally for classification.",
    description:
      "When you hit Sync, the app pulls your last 200 Gmail threads and upserts each one here. It stores just enough to classify and display — subject line, sender info, a snippet, and Gmail labels — without downloading full message bodies (those are fetched on-demand via the preview endpoint). The AI writes two fields: bucketId (which category it belongs to) and confidence (how sure it was, 0–1). The key design choice is userOverride: when you manually drag a thread to a different bucket, this flips to true, and future reclassifications will skip it. Your judgment always wins over the AI's.",
    fields: [
      { name: "id", type: "Gmail ID", note: "Not auto-generated — uses Gmail's real thread ID" },
      { name: "subject", type: "string", note: "Thread subject line for display + classification" },
      { name: "sender / senderEmail", type: "string", note: "Display name and email address" },
      { name: "snippet", type: "string", note: "Gmail preview text — fed to the AI classifier" },
      { name: "date", type: "DateTime", note: "Thread date, indexed descending for fast sorting" },
      { name: "gmailLabels", type: "string[]", note: "e.g. INBOX, IMPORTANT, CATEGORY_UPDATES" },
      { name: "messageCount", type: "int", note: "How many messages in the conversation" },
      { name: "bucketId", type: "string?", note: "FK to Bucket — null means unclassified" },
      { name: "confidence", type: "float?", note: "AI confidence score 0–1, null before classification" },
      { name: "userOverride", type: "boolean", note: "true = user moved this manually, AI won't overwrite" },
      { name: "classifiedAt", type: "DateTime?", note: "When the AI last classified this thread" },
    ],
    relations: [
      "User — Owner (cascade delete)",
      "Bucket — Assigned category (onDelete: SetNull — thread survives bucket deletion)",
    ],
  },
  {
    name: "Bucket",
    icon: "📂",
    color: COLORS.warning,
    colorDim: COLORS.warningDim,
    tagline: "A category you define to sort your emails into.",
    description:
      'Buckets are the categories that give Triage its power. You create them with a name and a plain-English description — "Urgent: time-sensitive emails that need a response today" or "Newsletters: marketing and subscription content I can batch-read later." When the AI runs, it reads every bucket\'s description to understand your intent, then sorts threads accordingly. The description field is literally part of the prompt sent to GPT-4o-mini. Deleting a bucket sets its threads\' bucketId to null (SetNull) — they become unclassified again, never deleted. The userId+name combo is unique, so you can\'t accidentally create duplicate bucket names.',
    fields: [
      { name: "name", type: "string", note: "Display name — unique per user" },
      { name: "description", type: "string", note: "Plain English — fed directly into the AI prompt" },
      { name: "sortOrder", type: "int", note: "Controls display order in the UI columns" },
      { name: "isDefault", type: "boolean", note: "System-created vs. user-created" },
    ],
    relations: [
      "User — Owner (cascade delete)",
      "EmailThread — Threads in this bucket (1:many, SetNull on delete)",
    ],
  },
  {
    name: "ClassificationRun",
    icon: "🤖",
    color: COLORS.purple,
    colorDim: COLORS.purpleDim,
    tagline: "Full audit log of every AI classification.",
    description:
      "This is the audit trail. Every time you click Classify, a new ClassificationRun is created with status 'pending'. As the pipeline processes batches, it transitions to 'running', tracks how many threads were classified, and records exact token counts and cost in cents. The bucketSnapshot field captures a JSON copy of all your buckets at that moment — so even if you rename or delete buckets later, you can always see exactly what categories the AI was working with. If the run fails, errorMessage captures why. This model powers the History tab, giving you full transparency into what the AI did, when, and at what cost.",
    fields: [
      { name: "status", type: "string", note: "pending → running → completed / failed" },
      { name: "totalThreads", type: "int", note: "How many threads the pipeline attempted" },
      { name: "classifiedCount", type: "int", note: "How many were successfully sorted" },
      { name: "bucketSnapshot", type: "JSON", note: "Frozen copy of all buckets at run time" },
      { name: "modelUsed", type: "string", note: "Which LLM ran — e.g. gpt-4o-mini" },
      { name: "inputTokens / outputTokens", type: "int?", note: "Exact token usage for cost tracking" },
      { name: "costCents", type: "float?", note: "Total API cost — typically ~$0.01 per run" },
      { name: "startedAt / completedAt", type: "DateTime", note: "Run duration tracking" },
      { name: "errorMessage", type: "string?", note: "Failure reason if status = failed" },
    ],
    relations: ["User — Who triggered this run (cascade delete)"],
  },
  {
    name: "SyncEvent",
    icon: "🔄",
    color: COLORS.pink,
    colorDim: COLORS.pinkDim,
    tagline: "A timestamped record of every Gmail sync.",
    description:
      "SyncEvent is the other half of the audit system. Each time you sync your inbox, a record is created logging how many threads Gmail returned (threadsFound), how many were brand new (newThreads), how many already existed and got updated (updatedThreads), and how long the whole operation took in milliseconds. If the Gmail API throws an error mid-sync, it's captured in errorMessage rather than silently failing. Together with ClassificationRun, these two models give you a complete timeline of every action the system has taken — visible in the History tab.",
    fields: [
      { name: "threadsFound", type: "int", note: "Total threads returned by Gmail API" },
      { name: "newThreads", type: "int", note: "Threads seen for the first time" },
      { name: "updatedThreads", type: "int", note: "Existing threads that got refreshed" },
      { name: "durationMs", type: "int?", note: "Wall-clock time for the sync operation" },
      { name: "errorMessage", type: "string?", note: "Captured error if sync failed" },
      { name: "createdAt", type: "DateTime", note: "Indexed descending for fast history queries" },
    ],
    relations: ["User — Who synced (cascade delete)"],
  },
  {
    name: "Account",
    icon: "🔑",
    color: COLORS.textDim,
    colorDim: "#1a1a1a",
    tagline: "Your Google OAuth connection — the key to Gmail.",
    description:
      "Account is managed entirely by NextAuth and stores the raw OAuth handshake with Google. The access_token is what lets the app call Gmail's API on your behalf — it's short-lived (usually 1 hour). When it expires, getValidAccessToken() in auth.ts uses the refresh_token to silently get a new one without you having to re-login. The provider + providerAccountId combo is unique, preventing duplicate OAuth links. You never interact with this model directly — it's infrastructure that makes the Gmail connection seamless.",
    fields: [
      { name: "provider", type: "string", note: "Always 'google' — extensible for future providers" },
      { name: "providerAccountId", type: "string", note: "Your Google account ID" },
      { name: "access_token", type: "text?", note: "Short-lived Gmail API access (auto-refreshed)" },
      { name: "refresh_token", type: "text?", note: "Long-lived token for silent renewal" },
      { name: "expires_at", type: "int?", note: "Unix timestamp — triggers auto-refresh when passed" },
    ],
    relations: ["User — Owner (cascade delete — removes OAuth link on account deletion)"],
  },
];

const flows = [
  {
    name: "Sign In",
    emoji: "🔐",
    steps: [
      { label: "You click Sign In with Google", icon: "👆" },
      { label: "Google OAuth grants access to Gmail", icon: "🔑" },
      { label: "Account + Session created in database", icon: "💾" },
      { label: "You land on the dashboard", icon: "🏠" },
    ],
  },
  {
    name: "Sync Inbox",
    emoji: "📥",
    steps: [
      { label: "Click Sync — fetches last 200 thread IDs", icon: "📋" },
      { label: "Batch-fetch metadata (25 at a time)", icon: "⚡" },
      { label: "Upsert each thread into database", icon: "💾" },
      { label: "SyncEvent logged with stats", icon: "📊" },
    ],
  },
  {
    name: "Classify",
    emoji: "🤖",
    steps: [
      { label: "Click Classify — pipeline starts streaming", icon: "▶️" },
      { label: "Threads batched, sent to GPT-4o-mini", icon: "🧠" },
      { label: "AI returns bucket + confidence per thread", icon: "📂" },
      { label: "Threads updated, ClassificationRun saved", icon: "✅" },
    ],
  },
  {
    name: "Organize",
    emoji: "✋",
    steps: [
      { label: "Create custom buckets with descriptions", icon: "📂" },
      { label: "AI suggests new buckets based on your mail", icon: "💡" },
      { label: "Drag threads between buckets manually", icon: "↔️" },
      { label: "Manual moves set userOverride = true", icon: "🔒" },
    ],
  },
];

function ModelCard({ model, isExpanded, onToggle }: { model: typeof models[number]; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        background: isExpanded ? COLORS.surface : "transparent",
        border: `1px solid ${isExpanded ? model.color + "44" : COLORS.border}`,
        borderRadius: 12,
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.3s ease",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{model.icon}</span>
          <div>
            <span
              style={{
                color: model.color,
                fontWeight: 700,
                fontSize: 18,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {model.name}
            </span>
            <span style={{ color: COLORS.textMuted, marginLeft: 12, fontSize: 14 }}>
              {model.tagline}
            </span>
          </div>
        </div>
        <span
          style={{
            color: COLORS.textDim,
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
            fontSize: 18,
          }}
        >
          ▼
        </span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease" }}>
          <p style={{ color: COLORS.textMuted, lineHeight: 1.6, margin: "0 0 16px 0", fontSize: 14 }}>
            {model.description}
          </p>

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                color: COLORS.textDim,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Key Fields
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              {model.fields.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: i % 2 === 0 ? "transparent" : COLORS.bg + "80",
                  }}
                >
                  <code
                    style={{
                      color: model.color,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      minWidth: 180,
                      flexShrink: 0,
                    }}
                  >
                    {f.name}
                  </code>
                  <span style={{ color: COLORS.textDim, fontSize: 12, minWidth: 80, flexShrink: 0 }}>
                    {f.type}
                  </span>
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{f.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                color: COLORS.textDim,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Connects To
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {model.relations.map((r, i) => (
                <span
                  key={i}
                  style={{
                    background: model.colorDim,
                    color: model.color,
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    border: `1px solid ${model.color}22`,
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RelationshipDiagram() {
  return (
    <svg viewBox="0 0 800 500" style={{ width: "100%", height: "auto" }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.textDim} />
        </marker>
        <marker id="arrowGreen" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.accent} />
        </marker>
        <marker id="arrowBlue" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.info} />
        </marker>
        <marker id="arrowYellow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.warning} />
        </marker>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Section labels */}
      <text x="110" y="145" textAnchor="middle" fill={COLORS.textDim} fontSize="9" fontFamily="monospace" opacity="0.5" letterSpacing="2">AUTH LAYER</text>
      <text x="470" y="145" textAnchor="middle" fill={COLORS.textDim} fontSize="9" fontFamily="monospace" opacity="0.5" letterSpacing="2">CORE DATA</text>
      <text x="400" y="290" textAnchor="middle" fill={COLORS.textDim} fontSize="9" fontFamily="monospace" opacity="0.5" letterSpacing="2">AUDIT TRAIL — FULL HISTORY OF EVERY AI + SYNC ACTION</text>

      {/* Connection lines */}
      <g opacity="0.5">
        {/* User → Account */}
        <line x1="370" y1="75" x2="165" y2="165" stroke={COLORS.textDim} strokeWidth="1.5" markerEnd="url(#arrow)" strokeDasharray="4 3" />
        {/* User → Session */}
        <line x1="370" y1="75" x2="165" y2="225" stroke={COLORS.textDim} strokeWidth="1.5" markerEnd="url(#arrow)" strokeDasharray="4 3" />
        {/* User → Bucket */}
        <line x1="430" y1="85" x2="470" y2="165" stroke={COLORS.warning} strokeWidth="1.5" markerEnd="url(#arrowYellow)" />
        {/* User → EmailThread */}
        <line x1="440" y1="75" x2="620" y2="165" stroke={COLORS.info} strokeWidth="1.5" markerEnd="url(#arrowBlue)" />
        {/* Bucket → EmailThread */}
        <line x1="530" y1="190" x2="570" y2="185" stroke={COLORS.warning} strokeWidth="2" markerEnd="url(#arrowYellow)" opacity="0.8" />
        {/* User → ClassificationRun */}
        <line x1="380" y1="95" x2="310" y2="310" stroke={COLORS.purple} strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* User → SyncEvent */}
        <line x1="420" y1="95" x2="540" y2="310" stroke={COLORS.pink} strokeWidth="1.5" markerEnd="url(#arrow)" />
      </g>

      {/* Dashed box around audit trail */}
      <rect x="195" y="298" width="450" height="80" rx="10" fill="none" stroke={COLORS.textDim} strokeWidth="1" strokeDasharray="6 4" opacity="0.3" />

      {/* User - center top */}
      <g filter="url(#glow)">
        <rect x="340" y="35" width="120" height="65" rx="10" fill={COLORS.surface} stroke={COLORS.accent} strokeWidth="2" />
        <text x="400" y="60" textAnchor="middle" fill={COLORS.accent} fontWeight="700" fontSize="15" fontFamily="monospace">👤 User</text>
        <text x="400" y="78" textAnchor="middle" fill={COLORS.textDim} fontSize="9" fontFamily="monospace">Central hub — owns</text>
        <text x="400" y="90" textAnchor="middle" fill={COLORS.textDim} fontSize="9" fontFamily="monospace">everything, cascades all</text>
      </g>

      {/* Account */}
      <rect x="60" y="158" width="150" height="50" rx="8" fill={COLORS.surface} stroke={COLORS.textDim} strokeWidth="1" />
      <text x="135" y="178" textAnchor="middle" fill={COLORS.textMuted} fontWeight="600" fontSize="12" fontFamily="monospace">🔑 Account</text>
      <text x="135" y="196" textAnchor="middle" fill={COLORS.textDim} fontSize="8" fontFamily="monospace">OAuth tokens (auto-refresh)</text>

      {/* Session */}
      <rect x="60" y="218" width="150" height="50" rx="8" fill={COLORS.surface} stroke={COLORS.textDim} strokeWidth="1" />
      <text x="135" y="238" textAnchor="middle" fill={COLORS.textMuted} fontWeight="600" fontSize="12" fontFamily="monospace">🔒 Session</text>
      <text x="135" y="256" textAnchor="middle" fill={COLORS.textDim} fontSize="8" fontFamily="monospace">NextAuth DB sessions</text>

      {/* Bucket */}
      <rect x="380" y="158" width="150" height="55" rx="8" fill={COLORS.surface} stroke={COLORS.warning} strokeWidth="1.5" />
      <text x="455" y="178" textAnchor="middle" fill={COLORS.warning} fontWeight="600" fontSize="12" fontFamily="monospace">📂 Bucket</text>
      <text x="455" y="194" textAnchor="middle" fill={COLORS.textDim} fontSize="8" fontFamily="monospace">User-defined categories</text>
      <text x="455" y="205" textAnchor="middle" fill={COLORS.textDim} fontSize="8" fontFamily="monospace">description → AI prompt</text>

      {/* EmailThread */}
      <rect x="560" y="158" width="175" height="55" rx="8" fill={COLORS.surface} stroke={COLORS.info} strokeWidth="1.5" />
      <text x="648" y="178" textAnchor="middle" fill={COLORS.info} fontWeight="600" fontSize="12" fontFamily="monospace">✉️ EmailThread</text>
      <text x="648" y="194" textAnchor="middle" fill={COLORS.textDim} fontSize="8" fontFamily="monospace">Gmail metadata + AI result</text>
      <text x="648" y="205" textAnchor="middle" fill={COLORS.textDim} fontSize="8" fontFamily="monospace">userOverride protects moves</text>

      {/* Bucket → EmailThread annotation */}
      <text x="553" y="177" textAnchor="middle" fill={COLORS.warning} fontSize="9" fontFamily="monospace" fontWeight="600">1:n</text>
      <text x="553" y="189" textAnchor="middle" fill={COLORS.textDim} fontSize="7" fontFamily="monospace">SetNull</text>

      {/* ClassificationRun */}
      <rect x="210" y="310" width="195" height="60" rx="8" fill={COLORS.surface} stroke={COLORS.purple} strokeWidth="1.5" />
      <text x="308" y="330" textAnchor="middle" fill={COLORS.purple} fontWeight="600" fontSize="12" fontFamily="monospace">🤖 ClassificationRun</text>
      <text x="308" y="346" textAnchor="middle" fill={COLORS.textDim} fontSize="8" fontFamily="monospace">tokens, cost, bucket snapshot</text>
      <text x="308" y="358" textAnchor="middle" fill={COLORS.textDim} fontSize="8" fontFamily="monospace">status: pending→running→done</text>

      {/* SyncEvent */}
      <rect x="440" y="310" width="190" height="60" rx="8" fill={COLORS.surface} stroke={COLORS.pink} strokeWidth="1.5" />
      <text x="535" y="330" textAnchor="middle" fill={COLORS.pink} fontWeight="600" fontSize="12" fontFamily="monospace">🔄 SyncEvent</text>
      <text x="535" y="346" textAnchor="middle" fill={COLORS.textDim} fontSize="8" fontFamily="monospace">threads found/new/updated</text>
      <text x="535" y="358" textAnchor="middle" fill={COLORS.textDim} fontSize="8" fontFamily="monospace">duration, errors captured</text>

      {/* History API annotation */}
      <rect x="295" y="400" width="255" height="36" rx="6" fill={COLORS.surface} stroke={COLORS.textDim} strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
      <text x="422" y="414" textAnchor="middle" fill={COLORS.accent} fontSize="9" fontFamily="monospace" fontWeight="600">GET /api/history</text>
      <text x="422" y="427" textAnchor="middle" fill={COLORS.textDim} fontSize="8" fontFamily="monospace">Last 50 of each → History tab timeline</text>
      <line x1="360" y1="400" x2="340" y2="370" stroke={COLORS.textDim} strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
      <line x1="490" y1="400" x2="500" y2="370" stroke={COLORS.textDim} strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />

      {/* Legend */}
      <g opacity="0.6">
        <line x1="30" y1="470" x2="60" y2="470" stroke={COLORS.textDim} strokeWidth="1.5" />
        <text x="68" y="473" fill={COLORS.textDim} fontSize="9" fontFamily="monospace">Data flow</text>
        <line x1="160" y1="470" x2="190" y2="470" stroke={COLORS.textDim} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="198" y="473" fill={COLORS.textDim} fontSize="9" fontFamily="monospace">Auth infra</text>
        <text x="310" y="473" fill={COLORS.textDim} fontSize="9" fontFamily="monospace">→ = owns (onDelete: Cascade unless noted)</text>
        <text x="650" y="473" fill={COLORS.accent} fontSize="9" fontFamily="monospace">All data is per-user</text>
      </g>
    </svg>
  );
}

function FlowCard({ flow }: { flow: typeof flows[number] }) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 20,
        flex: "1 1 320px",
        minWidth: 280,
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 12 }}>
        <span style={{ marginRight: 8 }}>{flow.emoji}</span>
        <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 16 }}>{flow.name}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {flow.steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: COLORS.accentDim,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  border: `1px solid ${COLORS.accent}44`,
                }}
              >
                {step.icon}
              </div>
              {i < flow.steps.length - 1 && (
                <div style={{ width: 1, height: 20, background: COLORS.border }} />
              )}
            </div>
            <div style={{ paddingTop: 6, color: COLORS.textMuted, fontSize: 13, lineHeight: 1.4 }}>
              {step.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiRoute({ method, path, description }: { method: string; path: string; description: string }) {
  const methodColors: Record<string, string> = {
    GET: "#10B981",
    POST: "#3B82F6",
    PATCH: "#F59E0B",
    DELETE: "#EF4444",
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        borderRadius: 8,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <span
        style={{
          background: methodColors[method] + "22",
          color: methodColors[method],
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          minWidth: 52,
          textAlign: "center",
        }}
      >
        {method}
      </span>
      <code
        style={{
          color: COLORS.text,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          minWidth: 200,
        }}
      >
        {path}
      </code>
      <span style={{ color: COLORS.textDim, fontSize: 12 }}>{description}</span>
    </div>
  );
}

export default function TenexTriageGuide() {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "models", label: "Data Models" },
    { id: "flows", label: "How It Works" },
    { id: "api", label: "API Routes" },
  ];

  return (
    <div
      style={{
        background: COLORS.bg,
        color: COLORS.text,
        minHeight: "100vh",
        fontFamily:
          "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "24px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: -0.5,
              }}
            >
              Tenex Triage
            </h1>
            <span
              style={{
                color: COLORS.accent,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                border: `1px solid ${COLORS.accent}44`,
                background: COLORS.accentDim,
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              Architecture Guide
            </span>
          </div>
          <p style={{ color: COLORS.textMuted, margin: "0", fontSize: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            AI-powered email triage — classify 200 threads in seconds, not hours.
            <a
              href="https://tenex-triage.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: COLORS.accent,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                textDecoration: "none",
                border: `1px solid ${COLORS.accent}44`,
                background: COLORS.accentDim,
                padding: "3px 10px",
                borderRadius: 4,
              }}
            >
              Try it live →
            </a>
          </p>
        </div>
      </div>

      {/* Marquee */}
      <div
        style={{
          borderBottom: `1px solid ${COLORS.border}`,
          overflow: "hidden",
          padding: "6px 0",
          background: COLORS.surface,
        }}
      >
        <div style={{ display: "flex", animation: "marquee 30s linear infinite", whiteSpace: "nowrap" }}>
          {Array(2)
            .fill(
              "Next.js 16 • Prisma • PostgreSQL • NextAuth v5 • Gmail API • GPT-4o-mini • Streaming Classification • Structured Outputs • Full Audit Trail • "
            )
            .map((text, i) => (
              <span
                key={i}
                style={{
                  color: COLORS.textDim,
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  paddingRight: 8,
                }}
              >
                {text}
              </span>
            ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "0 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", gap: 0 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${activeTab === tab.id ? COLORS.accent : "transparent"}`,
                color: activeTab === tab.id ? COLORS.text : COLORS.textDim,
                padding: "14px 20px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: activeTab === tab.id ? 600 : 400,
                fontFamily: "inherit",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 32px" }}>
        {activeTab === "overview" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, marginTop: 0 }}>
              What is Tenex Triage?
            </h2>
            <p style={{ color: COLORS.textMuted, lineHeight: 1.7, fontSize: 15, marginBottom: 24 }}>
              Triage connects to your Gmail, pulls your latest conversations, and uses AI to sort them
              into categories you define. Instead of scanning 200 emails one by one, the AI reads every
              subject line, sender, and snippet — then classifies each thread into the right bucket with
              a confidence score. You stay in control: create custom buckets, drag threads around, and
              the system remembers your preferences.
            </p>

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: COLORS.textMuted }}>
              The Four Core Loops
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {flows.map((flow) => (
                <FlowCard key={flow.name} flow={flow} />
              ))}
            </div>

            <div
              style={{
                marginTop: 32,
                padding: 20,
                background: COLORS.surface,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <h3 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 600 }}>
                Tech Stack at a Glance
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {[
                  ["Frontend", "Next.js 16 + React"],
                  ["Database", "PostgreSQL via Neon"],
                  ["ORM", "Prisma (typed models)"],
                  ["Auth", "NextAuth v5 + Google OAuth"],
                  ["Email", "Gmail API (read-only)"],
                  ["AI", "GPT-4o-mini (~$0.01/run)"],
                  ["Hosting", "Vercel (free tier)"],
                  ["Live", "tenex-triage.vercel.app"],
                  ["Source", "github.com/frogr/tenex-triage"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: COLORS.textDim, fontSize: 12, minWidth: 70 }}>{label}</span>
                    <span
                      style={{
                        color: COLORS.accent,
                        fontSize: 12,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "models" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>
              Data Models
            </h2>
            <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 8 }}>
              Six Prisma models power the app. User sits at the center — everything cascades from there.
              The top layer handles auth and core data (Buckets + EmailThreads), while the bottom layer
              is a full audit trail: ClassificationRun and SyncEvent log every AI action and every Gmail
              sync with timestamps, token counts, costs, and error states.
            </p>
            <p style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 24 }}>
              Click any model below to explore its fields, what they do, and how they connect.
            </p>

            <div
              style={{
                background: COLORS.surface,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                padding: 20,
                marginBottom: 24,
              }}
            >
              <RelationshipDiagram />
            </div>

            <div>
              {models.map((model) => (
                <ModelCard
                  key={model.name}
                  model={model}
                  isExpanded={expandedModel === model.name}
                  onToggle={() =>
                    setExpandedModel(expandedModel === model.name ? null : model.name)
                  }
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "flows" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>
              How Classification Works
            </h2>
            <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 24 }}>
              The classification pipeline is the core of Triage — here's the full flow from button click to sorted inbox.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                {
                  num: "01",
                  title: "Scan",
                  color: COLORS.accent,
                  desc: "Pipeline loads all unclassified threads (or all threads if reclassifyAll is true). Reads your bucket definitions.",
                  detail: "Source: classifier/pipeline.ts → runClassificationPipeline()",
                },
                {
                  num: "02",
                  title: "Batch",
                  color: COLORS.info,
                  desc: "Threads are split into batches of 25. Each batch becomes one API call — small enough to be reliable, large enough to be efficient.",
                  detail: "Source: classifier/batch.ts → createBatches() + runBatchesInParallel()",
                },
                {
                  num: "03",
                  title: "Classify",
                  color: COLORS.purple,
                  desc: "6 batches run in parallel. Each sends thread metadata + bucket descriptions to GPT-4o-mini with structured JSON output. One retry on failure.",
                  detail: "Schema: { classifications: [{ threadId, bucket, confidence }] }",
                },
                {
                  num: "04",
                  title: "Stream",
                  color: COLORS.warning,
                  desc: "Progress events stream back to the dashboard in real-time via newline-delimited JSON. The UI updates as each batch completes.",
                  detail: "Events: scanning → classifying → progress → complete/error",
                },
                {
                  num: "05",
                  title: "Persist",
                  color: COLORS.pink,
                  desc: "Each thread gets its bucketId and confidence updated. A ClassificationRun record captures the full audit trail — tokens, cost, bucket snapshot.",
                  detail: "Models: EmailThread (update), ClassificationRun (create)",
                },
              ].map((step, i) => (
                <div
                  key={step.num}
                  style={{
                    display: "flex",
                    gap: 20,
                    padding: "20px 0",
                    borderBottom: i < 4 ? `1px solid ${COLORS.border}` : "none",
                    animation: `slideIn 0.4s ease ${i * 0.08}s both`,
                  }}
                >
                  <div
                    style={{
                      color: step.color,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 32,
                      fontWeight: 700,
                      opacity: 0.3,
                      minWidth: 50,
                      lineHeight: 1,
                    }}
                  >
                    {step.num}
                  </div>
                  <div>
                    <h3
                      style={{
                        color: step.color,
                        fontSize: 18,
                        fontWeight: 700,
                        margin: "0 0 6px 0",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "0 0 8px 0", lineHeight: 1.5 }}>
                      {step.desc}
                    </p>
                    <code
                      style={{
                        color: COLORS.textDim,
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: COLORS.surface,
                        padding: "3px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {step.detail}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>
              API Routes
            </h2>
            <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 24 }}>
              13 endpoints power the app. All require authentication via NextAuth session.
            </p>

            {[
              {
                group: "Gmail Sync",
                routes: [
                  { method: "GET", path: "/api/threads?sync=true", description: "Fetch 200 threads from Gmail, upsert to DB" },
                  { method: "GET", path: "/api/threads", description: "List all threads from database" },
                ],
              },
              {
                group: "Classification",
                routes: [
                  { method: "POST", path: "/api/classify", description: "Run AI pipeline (streaming response)" },
                ],
              },
              {
                group: "Threads",
                routes: [
                  { method: "PATCH", path: "/api/threads/[id]", description: "Move thread to bucket (sets userOverride)" },
                  { method: "PATCH", path: "/api/threads/bulk", description: "Bulk move threads" },
                  { method: "GET", path: "/api/threads/[id]/preview", description: "Fetch full message body from Gmail" },
                ],
              },
              {
                group: "Buckets",
                routes: [
                  { method: "GET", path: "/api/buckets", description: "List buckets with thread counts" },
                  { method: "POST", path: "/api/buckets", description: "Create bucket (auto sort order)" },
                  { method: "PATCH", path: "/api/buckets/[id]", description: "Update name/description" },
                  { method: "DELETE", path: "/api/buckets/[id]", description: "Delete (threads unassigned)" },
                ],
              },
              {
                group: "AI Features",
                routes: [
                  { method: "GET", path: "/api/suggestions", description: "AI suggests 1-3 new buckets" },
                ],
              },
              {
                group: "History",
                routes: [
                  { method: "GET", path: "/api/history", description: "Last 50 runs + last 50 syncs" },
                ],
              },
            ].map((section) => (
              <div key={section.group} style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    color: COLORS.textDim,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  {section.group}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {section.routes.map((route) => (
                    <ApiRoute key={route.path + route.method} {...route} />
                  ))}
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: COLORS.surface,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <div style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
                CLIENT → API CALL MAP
              </div>
              <pre
                style={{
                  color: COLORS.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  lineHeight: 1.8,
                  margin: 0,
                  overflow: "auto",
                }}
              >{`dashboard.tsx (orchestrator)
├── loadData()           → GET /api/buckets + GET /api/threads
├── handleSync()         → GET /api/threads?sync=true
├── handleClassify()     → POST /api/classify (streaming)
├── handleMoveThread()   → PATCH /api/threads/[id]
├── handleBulkMove()     → PATCH /api/threads/bulk
├── handleCreateBucket() → POST /api/buckets → POST /api/classify
├── handleSaveBucket()   → PATCH /api/buckets/[id]
└── handleDeleteBucket() → DELETE /api/buckets/[id]

thread-card.tsx
└── handleExpand()       → GET /api/threads/[id]/preview

create-bucket-dialog.tsx
└── fetchSuggestions()   → GET /api/suggestions`}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: `1px solid ${COLORS.border}`,
          padding: "16px 32px",
          marginTop: 48,
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: COLORS.textDim, fontSize: 12 }}>
            Built by Austin French • Senior Backend Engineer
          </span>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a
              href="https://tenex-triage.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: COLORS.accent,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                textDecoration: "none",
              }}
            >
              Live App →
            </a>
            <span style={{ color: COLORS.border }}>|</span>
            <a
              href="https://github.com/frogr/tenex-triage"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: COLORS.textMuted,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                textDecoration: "none",
              }}
            >
              GitHub →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
