# Phase 2 Event Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add event multi-selection, selected-event context packs, and batch deletion as the first Phase 2 enhancement.

**Architecture:** Keep selection state in React, but isolate pure selection behavior in `src/lib/selection.ts` so it is easy to test. Reuse the existing `eventApi.deleteEvents` and `eventApi.generateContextPack({ selectedIds })` contracts.

**Tech Stack:** React, TypeScript, Vitest, existing Tauri command API.

---

### Task 1: Selection Helpers

**Files:**
- Create: `src/lib/selection.ts`
- Test: `src/lib/selection.test.ts`

- [x] **Step 1: Write failing tests**

Tests cover toggling ids, selecting visible ids, pruning invisible ids, clearing selection, and rendering a Chinese summary.

- [x] **Step 2: Run test to verify failure**

Run: `npm.cmd test -- src/lib/selection.test.ts`

Expected: fails because `src/lib/selection.ts` does not exist.

- [x] **Step 3: Implement helpers**

Implement `toggleSelection`, `selectAllVisible`, `pruneSelection`, `clearSelection`, and `getSelectionSummary`.

- [x] **Step 4: Run test to verify pass**

Run: `npm.cmd test -- src/lib/selection.test.ts`

Expected: all selection tests pass.

### Task 2: Timeline Selection UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/EventCard.tsx`

- [x] **Step 1: Add selection props to EventCard**

Add `selected?: boolean` and `onSelectedChange?: (id: string) => void`.

- [x] **Step 2: Render checkbox affordance**

Render a stable checkbox at the start of each event card without resizing the card.

- [x] **Step 3: Wire App state**

Store `selectedIds`, prune when visible events change, and add select all / clear buttons.

- [x] **Step 4: Generate selected context pack**

When events are selected, pass `selectedIds` to `eventApi.generateContextPack`.

- [x] **Step 5: Batch delete**

Call `eventApi.deleteEvents(selectedIds)`, clear selection, and refresh events.

### Task 3: Verification

**Files:**
- No source files unless verification reveals defects.

- [x] **Step 1: Run unit tests**

Run: `npm.cmd test`

- [x] **Step 2: Run frontend build**

Run: `npm.cmd run build`

- [x] **Step 3: Record native limitation**

Run: `cargo check` in `src-tauri` only after MSVC Build Tools is installed. Until then, document that `link.exe` is missing.
