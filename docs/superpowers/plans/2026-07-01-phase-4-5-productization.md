# Phase 4 and 5 Productization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the local foundations for Phase 4 permission controls and Phase 5 productization exports/settings.

**Architecture:** Keep permission policy and share-package generation as tested pure modules. Persist product settings in the existing local settings store, then surface them in `SettingsView` without adding cloud or signing behavior that cannot be verified locally.

**Tech Stack:** React, TypeScript, Vitest, existing local settings store.

---

### Task 1: Permission Center Model

**Files:**
- Create: `src/lib/permissions.ts`
- Test: `src/lib/permissions.test.ts`

- [x] **Step 1: Write failing tests**

Covered source catalog descriptions, disabled-by-default external sources, event type permissions, global pause, and immutable updates.

- [x] **Step 2: Implement permission model**

Added `SourceId`, `PermissionSettings`, source catalog, default settings, update helper, and `canSourceIngest`.

### Task 2: Share Package Exports

**Files:**
- Create: `src/lib/sharePackage.ts`
- Test: `src/lib/sharePackage.test.ts`

- [x] **Step 1: Write failing tests**

Covered selected-event JSON export and sensitive redaction across JSON, Markdown, and Bug report formats.

- [x] **Step 2: Implement share package generator**

Added `generateSharePackage` and sensitive event redaction.

### Task 3: Product Settings Persistence

**Files:**
- Modify: `src/lib/settings.ts`
- Test: `src/lib/settings.test.ts`

- [x] **Step 1: Extend settings tests**

Covered `cloudSyncEnabled`, `language`, `ingestionToken`, and permission center persistence.

- [x] **Step 2: Implement settings fields**

Extended defaults and sanitization with Phase 4/5 settings.

### Task 4: UI Integration

**Files:**
- Modify: `src/components/SettingsView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/ContextPackModal.tsx`

- [x] **Step 1: Add permission center UI**

Settings now shows each source, what it collects, what it does not collect, source toggles, and global pause.

- [x] **Step 2: Add ingestion token UI**

Settings can generate and display a local ingestion token.

- [x] **Step 3: Add v1.0 settings UI**

Settings includes encrypted cloud sync toggle and language selector. Sync remains a local setting only.

- [x] **Step 4: Add share package buttons**

Main toolbar now exports JSON and Bug report packages with sensitive content redacted.

### Task 5: Verification

- [x] **Step 1: Run targeted tests**

Run: `npm.cmd test -- src/lib/permissions.test.ts src/lib/sharePackage.test.ts src/lib/settings.test.ts`

Result: passed.

- [x] **Step 2: Run all tests**

Run: `npm.cmd test`

Result: 14 test files passed, 52 tests passed.

- [x] **Step 3: Run frontend build**

Run: `npm.cmd run build`

Result: passed.

### Remaining Phase 5 Work

- Windows signing certificate and installer validation.
- Real auto-update channel.
- Real encrypted sync service and key management.
- macOS notarization and Linux packages.
