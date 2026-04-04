# FFT_nano — Deep Context Document
**Author:** hermes (operating manager)
**Scope:** fft_nano only. nano_core is separate and out of scope.
**Last updated:** 2026-04-03

---

## What FFT_nano IS

FFT_nano is a **chat-hosted coding agent** — a messaging-native AI assistant that runs coding tasks on behalf of a user. It is not a chatbot. It is not a general-purpose assistant. It is a specialized agent that accepts natural language instructions and executes coding work in an isolated, recoverable environment.

The primary interface is **Telegram** (or WhatsApp via Baileys). The CLI/TUI is the core experience and source of truth. The agent can run entirely without Telegram using only the local TUI gateway.

**The core promise:** A farmer who cannot code gets a competent developer embedded in their messaging app. The farmer says what they need in plain English. The agent writes, tests, and fixes code.

---

## Architecture

### High-Level Layers

```
User (Telegram / WhatsApp / TUI)
    ↓ messages
FFT_nano Host (Node.js, TypeScript)
    ├── Messaging adapters (Telegram Bot API / Baileys WhatsApp)
    ├── TUI Gateway (WebSocket JSON-RPC, port 28989/28991)
    ├── Scheduler (cron v2)
    ├── Heartbeat (periodic liveness check)
    ├── Memory system (lexical + canonical durable files)
    ├── System prompt builder
    └── pi-runner (spawns pi as host subprocess)
         ↓
    pi Coding Agent (isolated)
         ├── MCP tools
         ├── Memory protocol
         └── Executes coding tasks
```

### Key Files (what they do)

| File | Role |
|------|------|
| `src/index.ts` | Main entry point. 5,300+ lines. Orchestrates everything. |
| `src/pi-runner.ts` | Spawns the `pi` coding agent as a child process. Handles stdin/stdout JSON-RPC. 1,700+ lines. |
| `src/sandbox.ts` | Optional isolation wrappers: `bwrap`, `docker`, or `none`. Default is `none` (pi runs directly on host). |
| `src/coding-orchestrator.ts` | Routes `/coding` and `/coder` commands. Manages worktree lifecycle. |
| `src/memory-action-gateway.ts` | Handles memory read/write operations with cross-group access controls. |
| `src/farm-action-gateway.ts` | Farm-specific actions (Home Assistant, dashboard patching). |
| `src/system-prompt.ts` | Builds the system prompt with budgets, memory injection, and skill catalog. |
| `src/prompt-lifecycle.ts` | Tracks prompt epochs, detects corruption, manages flush/baseline cycles. |
| `src/tui/gateway-server.ts` | WebSocket JSON-RPC server for TUI connections. |
| `src/tui/client.ts` | TUI rendering using `@mariozechner/pi-tui`. |
| `container/Dockerfile` | **STALE** — references deleted `agent-runner/` directory. Needs rewrite. |

### Runtime Modes

| Mode | Setting | Behavior |
|------|---------|----------|
| Docker (default) | `FFT_NANO_SANDBOX=docker` | pi runs inside `fft-nano-agent:latest` Docker image |
| bwrap | `FFT_NANO_SANDBOX=bwrap` | Linux bubblewrap sandbox (not available on macOS) |
| Host | `FFT_NANO_SANDBOX=none` | pi runs as bare host subprocess (fastest, least isolated) |

Production uses Docker. Dev instances typically use `none` or `bwrap`.

### The pi Coding Agent

`pi` is `@mariozechner/pi-coding-agent` — a separate npm package installed globally. It is NOT part of this repo. It receives prompts via stdin JSON-RPC and streams back events (thinking, tool calls, responses) via stdout.

Key fact: `pi` is a **stateless subprocess**. Each run gets a fresh session. State is maintained by FFT_nano's memory system, not by pi itself.

---

## Coding Delegation System

### Two Commands

**`/coding`** — Natural language coding request. The system decides whether to:
- **Execute mode**: Creates an isolated git worktree, runs pi with full tool access
- **Plan mode**: Read-only. pi analyzes but cannot write files. Proposes changes.

**`/coder`** — Explicit coding agent invocation. Bypasses natural language classification. Always goes to execute mode (with approval gate).

### Classification Logic (how natural language gets routed)

FFT_nano uses a **substantial coding ask classifier** — if the message looks like a coding request, it triggers `/coding` routing. Non-coding messages go to the direct agent path.

### Git Worktree Isolation (the safety architecture)

When `/coding` runs in execute mode:
1. Creates a **detached HEAD worktree** at `/tmp/fft-nano-coder-worktrees/<request-id>/`
2. Copies the source workspace into it (rsync, excluding `node_modules`, `.git`, etc.)
3. pi works inside the worktree
4. Results are summarized back to the user
5. Worktree is cleaned up (git worktree remove → fs.rmSync fallback)

**This means pi can delete everything in the worktree and it has zero effect on the actual codebase.**

### The Zero-Commit Bug (recently fixed)

`git worktree add --detach <path> HEAD` requires at least one commit to exist. On brand-new repos with zero commits, this fails with `fatal: invalid reference: HEAD`. Fix: fall back to the current branch name.

---

## Messaging Architecture

### Session Model

Sessions are tied to **registered messaging groups** — Telegram chats or WhatsApp groups. Each group has:
- A `chatJid` (e.g., `telegram:8517328398`)
- A workspace directory (`groups/<group>/`)
- A session key (`main` for the primary Telegram DM, or `telegram:<chat_id>` for groups)

The TUI gateway requires an active session. Without Telegram connected, the gateway has zero sessions and `chat.send` returns "Unknown session."

### Startup Session Registration

On WhatsApp connect, `ensureMainGroupRegistered()` registers the self-chat JID as the main session. Without WhatsApp auth, no main session exists unless Telegram is configured.

**This is the primary developer friction point** — the TUI gateway cannot be used interactively without a messaging backend.

### How to Actually Test the Agent

1. Connect to production gateway (`ws://127.0.0.1:28989`) which has live Telegram sessions
2. Use a WebSocket script to send `chat.send` frames
3. Or: run `fft tui` from a machine with an active Telegram session

---

## Memory System

### Dual-Backend Architecture

1. **Lexical memory** — Vector-style semantic search over transcript chunks stored in SQLite
2. **Canonical durable files** — `NANO.md` (operational guidance), `SOUL.md` (persona), `MEMORY.md` (legacy), `TODOS.md` (task board)

### Memory Retrieval Gate

`MEMORY_RETRIEVAL_GATE_ENABLED=1` controls whether memory context is injected into prompts. When enabled:
- Top-K snippets injected
- Hard character budget enforced
- Cross-group access denied

### The Memory Protocol

pi communicates with FFT_nano's memory via structured tool calls, not direct file access. This prevents pi from reading arbitrary files outside its workspace.

---

## Safety Architecture

### Protected Paths

The system maintains a list of protected paths that pi cannot modify or delete. This is enforced at the tool-call level in pi's guardrails, not trusted purely by the agent.

### Confirmation Gates

- `/coding` on non-git-backed projects → falls back to plan mode, prompts to init git
- Destructive commands → blocked by default, require explicit approval
- Subagent spawning → routed through the orchestrator with explicit routing metadata

### Git Worktree as Safety Boundary

The worktree isolation means the worst case is a worktree gets orphaned (if cleanup fails). It cannot touch the actual codebase or farm data.

---

## Brand Positioning

### Current State

FFT_nano is positioned as "an open-source coding agent for farmers" but the codebase is **domain-agnostic**. The farming specificity comes from:
- `FFT_PROFILE=farm` environment variable
- Farm-specific skills and system prompt overlays
- Farm dashboard integration (Home Assistant)
- The brand voice in `SOUL.md`

### The Branding Opportunity

The agent is technically a **general-purpose coding companion** that can be specialized for any domain. Farm Friend Technologies uses it for farming. The same engine could be:
- A **legal research agent** for law firms
- A **maintenance agent** for property management
- A **diagnostic agent** for healthcare

The industry-specific "skin" is applied via:
1. System prompt (`SOUL.md`, `NANO.md`)
2. Skills catalog (domain-specific tool sets)
3. Memory context (industry corpus)

### Key Brand Elements

- **"FFT"** = Farm Friend Technologies, or "Foundation for the Future"
- **"nano"** = small, focused, lightweight, atomic unit of capability
- **"pi"** = the coding agent itself (punning on Raspberry Pi / the mathematical constant)
- **Tagline possibility**: "Your farm's invisible engineer"

---

## Known Gaps and Improvement Opportunities

### Critical (blocks production use)

1. **Stale Dockerfile** — references deleted `container/agent-runner/` directory (commit 4b74486). Completely broken. Needs full rewrite.
2. **`fft-nano-pi:latest` Docker image doesn't exist** — Docker sandbox mode (`FFT_NANO_SANDBOX=docker`) can't work without it
3. **No session creation without Telegram** — TUI gateway is unusable for local-only testing without a messaging backend

### High Priority

4. **FFT Control Center build missing** — `npm run web:build` not run, so the web dashboard shows a warning and serves nothing
5. **pi not on host PATH** — pi only runs inside Docker container in production. Direct host execution requires separate pi installation.
6. **Monolithic `index.ts`** — 5,300 lines is too large for effective review. Needs decomposition into focused modules.

### Medium Priority

7. **Worktree cleanup race condition** — cleanup is now in finally block but the `cleanedUp` flag guard is fragile if cleanup throws
8. **No prompt lifecycle profiling UI** — the `prompt-state.json` tracking exists but has no human-readable debug surface
9. **WhatsApp Baileys fragility** — "not logged in / attempting registration" is expected in dev but the reconnect logic is unclear

### Features Worth Exploring

- **Voice input** via Telegram voice messages → transcribed → agent processes
- **Image understanding** — pi can call vision tools; could inspect plant photos, soil images
- **Autonomous overnight runs** — scheduler already exists; cron jobs could trigger agent work loops
- **Multi-agent fanout** — one request → parallel pi instances across different worktrees
- **Skill marketplace** — users share skill configurations as gists

---

## Testing Loop (current state)

```
1. git checkout -b feature/xxx  (branch off dev)
2. make changes
3. npm test  (320 tests, must all pass)
4. npm run doctor  (should be all PASS)
5. docker build  (blocked — Dockerfile is stale)
6. FFT_NANO_DRY_RUN=1 node src/index.ts  (verify startup)
7. fft tui  (connect to verify gateway)
8. git commit on feature branch
9. merge PR to dev
```

---

## The Agent's Performance Character (from live testing)

**Strengths:**
- Ping response is instant and clean
- `/status` returns useful system info
- Natural language coding → valid code (TypeScript function returned correctly)
- `/coding` delegation → executes bash commands with proper isolation
- Plan mode safely falls back when git isn't initialized

**Weaknesses:**
- First-time setup requires git init (confusing UX if not explained)
- Zero-commit repos crash worktree creation (now fixed, but was a real blocker)
- Docker runtime means cold starts are slow (~12s per pi run observed in production logs)
- No session = TUI useless (developer experience friction for local testing)

---

## Architecture Decision Record

| Decision | Date | Rationale |
|----------|------|-----------|
| Replace agent-runner with pi-runner subprocess | 2026-03-20 (commit 4b74486) | Eliminated ~2,600 lines. Fixed dangling event-loop resources that caused /coder hang bug. |
| Git worktree isolation for execute mode | Original design | Safety boundary: agent can delete worktree contents without touching production data. |
| better-sqlite3 12.8.0 upgrade | 2026-04-03 | Node v25 compatibility. |
| finally-block cleanup for worktrees | 2026-04-03 | Prevented worktree leakage on success path. |

---

*This document is the authoritative deep context for FFT_nano. Update it when architecture changes, not just when features are added.*
