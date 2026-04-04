# FFT_nano — Agent Evaluation (fft_nano-dev worktree)

**Date:** 2026-04-03
**Status:** 320/320 tests pass | TypeScript clean | Skills valid

---

## What It Is

Single-process Node.js/TypeScript host that runs `@mariozechner/pi-coding-agent` inside an isolated Docker container, routing chat I/O through Telegram and/or WhatsApp.

```
Telegram / WhatsApp
       ↓
  SQLite (router_state, registered_groups, messages)
       ↓
  Host Router/Scheduler (src/index.ts — 153KB, ~5000 lines)
       ↓
  Docker Container (pi-runner spawns pi coding agent)
       ↓
  Pi Agent (LLM: OpenAI/Claude/Gemini/GLM-4.7/etc.)
       ↓
  Response back to originating chat
```

---

## Codebase Stats

| Area | Files | Notes |
|---|---|---|
| `src/` | 69 | ~21K lines TypeScript |
| `tests/` | 54 | ~12K lines, Node test runner |
| `docs-site/` | 16 | Developer HTML+MD docs |
| `skills/runtime/` | 9 skills | Project skills |

---

## Key Files

| File | Purpose |
|---|---|
| `src/index.ts` | Host entry — Telegram/WhatsApp polling, routing, scheduling (~5000 lines) |
| `src/pi-runner.ts` | Container spawn, pi process management, lifecycle, timeout, stale detection (~1700 lines) |
| `src/system-prompt.ts` | Prompt assembly — base layer cache, context injection, budget management, injection detection (~970 lines) |
| `src/message-dispatch.ts` | Request classification, queue management, run coordination (~1300 lines) |
| `src/coding-orchestrator.ts` | `/coder` delegation, isolated git worktree for execute mode (~630 lines) |
| `src/memory-*.ts` | MEMORY.md/SOUL.md protocol, BM25 search, daily files, session transcripts |
| `src/cron/` | Cron v2 scheduler — cron/interval/once, group/isolated context, delivery modes |
| `src/bash-guard.ts` | DESTRUCTIVE_PATTERNS blocklist (rm -rf, git reset --hard, etc.) |
| `src/sandbox.ts` | bwrap/docker/none sandbox wrapping |
| `src/pi-skills.ts` | Skill mirror protocol, SKILL.md validation |
| `src/onboard-cli.ts` | Guided onboarding wizard |
| `src/workspace-bootstrap.ts` | Auto-seed NANO.md/SOUL.md/TODOS.md/HEARTBEAT.md/MEMORY.md |
| `src/container-runtime.ts` | Docker vs host runtime detection |

---

## Memory Protocol

- `MEMORY.md` — canonical durable memory (per group + global)
- `SOUL.md` — identity/policy context (stable, not a compaction log)
- `memory/YYYY-MM-DD.md` — daily working memory
- BM25 search across memory docs AND session transcripts
- Budget-managed injection with truncation (12K per file, 48K total default)

---

## LLM Providers (9 presets)

OpenAI | Anthropic | Gemini | LM Studio | Ollama | Z.AI (GLM-4.7) | MiniMax | Kimi Coding | OpenRouter

---

## Skills (9 runtime)

| Skill | Purpose |
|---|---|
| `fft-setup` | Install/bootstrap FFT_nano |
| `fft-debug` | Runtime triage — logs, provider wiring, Docker, Telegram |
| `fft-telegram-ops` | Telegram-specific operations |
| `fft-coder-ops` | Coding delegation management |
| `fft-farm-bootstrap` | Farm mode bootstrap |
| `fft-farm-onboarding` | Farm onboarding wizard |
| `fft-farm-ops` | Farm operations (HA integration) |
| `fft-dashboard-ops` | Dashboard companion repo management |
| `agent-browser` | Browser automation for Pi agent |
| `rapid-research` | Research playbook with citation tracking + templates |

---

## Security Layers

- **Bash guard** — Regex blocklist: `rm -rf`, `git reset --hard`, `git push -f`, `chmod -R 777`, `dd`, `mkfs`, `shred`, etc.
- **Mount allowlist** — `~/.config/fft_nano/mount-allowlist.json` (outside project root, not mounted into containers)
- **Permission gates** — User approval via Telegram inline keyboard for dangerous ops
- **Sandbox** — `FFT_NANO_SANDBOX=bwrap|docker|none` (default: none)
- **Container isolation** — Docker default, optional host runtime with explicit opt-in

---

## Docker Architecture

- **Image:** `fft-nano-agent:latest` (default, configurable via `CONTAINER_IMAGE`)
- **Base:** `node:22-slim` + Chromium for browser automation
- **Runtime:** `@mariozechner/pi-coding-agent` + `agent-browser` installed globally
- **IPC:** `data/ipc/<group>/` mounted to `/workspace/ipc` — messages, tasks, actions, action_results
- **Workspace:** group dir mounted at `/workspace/group`, global at `/workspace/global`
- **Entry:** JSON stdin → Node process → JSON stdout

---

## Critical Issues

### 1. `container/agent-runner/` is missing
The Dockerfile copies `agent-runner/` but this directory doesn't exist in the repo. Docker image cannot be built as-is.

**Impact:** Cannot build `fft-nano-agent:latest`
**Action needed:** Determine if this is missing source or a stale Dockerfile reference.

### 2. Docker image not built
No `fft-nano-agent:latest` exists locally.
```bash
docker images | grep fft  # returns nothing
```

### 3. `better-sqlite3` Node v25 incompatibility (FIXED)
Was compiled for Node v22 (NODE_MODULE_VERSION 127), running Node v25 (141).
**Fix applied:** upgraded `better-sqlite3` 11.8.1 → 12.8.0. Tests now pass (320/320).

### 4. No runtime configured
- No `.env` file
- No `pi` on host PATH (only available inside container)
- No active service running

---

## How It Compares to Hermes

| Dimension | Hermes | FFT_nano |
|---|---|---|
| Size/weight | Full operating manager | Lighter, chat+container focus |
| Agent runtime | Own process | Docker container + pi coding agent |
| Memory | Honcho structured | Flat files (MEMORY.md, SOUL.md) |
| Skills | 150+ (CYBERDYNE.SKILLS) | 9 project skills |
| Isolation | Process-level | Docker container-level |
| Scheduling | Cron jobs | Cron v2 (group/isolated contexts) |
| Chat | Telegram, Discord, etc. | Telegram, WhatsApp |
| Web/TUI | Both | Both (Web Control Center + TUI) |
| Coding | Codex, Claude Code | `/coder` → isolated git worktree + pi |

FFT_nano is more focused — specifically a chat-hosted coding agent with Docker isolation and farm/HomeAssistant integration.

---

## Not-Yet-Tested (needs provider key)

- Actual pi agent runs (needs `PI_API_KEY`)
- Docker container cold-start latency
- Skill mirror protocol in container
- Telegram streaming (tool progress bubbles)
- WhatsApp session management
- Farm/HomeAssistant integration
- Cron scheduler under load
- Prompt cache hit rate
- Error recovery (kill mid-run)

---

## Potential Improvements

1. **Fix `container/agent-runner/` gap** — Determine source or update Dockerfile
2. **Build and test Docker image** — `cd container && ./build-docker.sh`
3. **Dry-run smoke test** — `FFT_NANO_DRY_RUN=1 ./scripts/start.sh dev telegram-only`
4. **Container cold-start profiling** — Measure Docker pull + spawn + pi init latency
5. **Memory usage profiling** — Host process, container, SQLite growth over time
6. **Error recovery testing** — Kill container/host mid-run, verify no state corruption
7. **Add image generation skill** — `nano-banana-pro` could be Pi-accessible
8. **Container keep-alive pool** — Pre-warm containers if startup is slow
9. **Structured observability** — Latency per stage metrics (poll → route → spawn → pi → response)
