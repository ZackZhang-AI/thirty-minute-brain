# Phase 3 Workflow Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Phase 3 workflow-ingestion foundation for browser, VS Code, and terminal sources while keeping privacy boundaries explicit.

**Architecture:** External clients send the same `CreateEventRequest` contract. The app normalizes every request through source/type permission checks, required-field validation, metadata sanitization, sensitive filtering, de-duplication, expiration setup, and existing search indexing.

**Tech Stack:** TypeScript, Vitest, React/Tauri command API, Rust Tauri backend, browser extension MV3 scaffold, VS Code extension scaffold, shell hook scripts.

---

### Task 1: Ingestion Protocol and Permissions

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/ingestion.ts`
- Test: `src/lib/ingestion.test.ts`

- [x] **Step 1: Add tests**

Add tests that prove:
- `browser_extension` can only send `browser_tab`.
- `vscode_extension` can send `editor_file` and `editor_selection`.
- `shell_hook` can only send `command`.
- `terminal_history`, `browser_history`, and unknown external sources are rejected.
- terminal output metadata is stripped before storage.

- [x] **Step 2: Implement policy**

Define a source permission policy and make `normalizeCreateEventRequest` enforce it.

### Task 2: External Event De-Dupe

**Files:**
- Modify: `src/lib/localStore.ts`
- Test: `src/lib/localStore.test.ts`

- [x] **Step 1: Add tests**

Add a test that two identical external browser tab events return the existing event instead of creating duplicates.

- [x] **Step 2: Implement de-dupe**

Hash stable normalized fields and store the hash in `contentHash`.

### Task 3: Tauri Ingestion Command

**Files:**
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/main.rs`

- [x] **Step 1: Add command alias**

Expose `ingest_external_event(input)` as a named command that calls the same backend path as `create_event`.

- [x] **Step 2: Register command**

Register the command in `tauri::generate_handler!`.

### Task 4: External Client Scaffolds

**Files:**
- Create: `integrations/browser-extension/*`
- Create: `integrations/vscode-extension/*`
- Create: `integrations/shell-hooks/*`
- Create: `docs/PHASE3-INTEGRATIONS.md`

- [x] **Step 1: Browser extension**

Create a minimal Manifest V3 extension that saves only the active tab when the user clicks the extension button.

- [x] **Step 2: VS Code extension**

Create a minimal extension scaffold with commands to send current file and active selection.

- [x] **Step 3: Shell hooks**

Create PowerShell, bash, and zsh hook examples that send only command text and never command output.

- [x] **Step 4: Documentation**

Document the local ingestion contract, privacy rules, and current limitation that loopback/deep link runtime wiring is the next native step.

### Task 5: Verification

- [x] **Step 1: Run targeted tests**

Run: `npm.cmd test -- src/lib/ingestion.test.ts src/lib/localStore.test.ts`

- [x] **Step 2: Run all tests**

Run: `npm.cmd test`

- [x] **Step 3: Run frontend build**

Run: `npm.cmd run build`

- [x] **Step 4: Native note**

Run `cargo check` only to confirm the current machine still lacks MSVC `link.exe` until Build Tools are installed.
