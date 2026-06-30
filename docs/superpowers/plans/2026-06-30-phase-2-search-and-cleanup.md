# Phase 2 Search Highlight and Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Phase 2 usability with search match highlighting and time-window cleanup controls.

**Architecture:** Use a tested pure text splitting helper in `src/lib/highlight.ts`, render highlights through a small React component, and reuse existing `eventApi.clearEvents({ windowMinutes })` for cleanup.

**Tech Stack:** React, TypeScript, Vitest, existing event API.

---

### Task 1: Search Highlight Helper

**Files:**
- Create: `src/lib/highlight.ts`
- Test: `src/lib/highlight.test.ts`

- [x] **Step 1: Write failing tests**

Covered empty query, case-insensitive matching, repeated matches, and regex-like characters as plain text.

- [x] **Step 2: Run test to verify failure**

Run: `npm.cmd test -- src/lib/highlight.test.ts`

Result: failed because `src/lib/highlight.ts` did not exist.

- [x] **Step 3: Implement helper**

Implemented `splitHighlightedText(value, query)`.

- [x] **Step 4: Run test to verify pass**

Run: `npm.cmd test -- src/lib/highlight.test.ts`

Result: passed.

### Task 2: Highlight Rendering

**Files:**
- Create: `src/components/HighlightedText.tsx`
- Modify: `src/components/EventCard.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/EventCard.test.tsx`

- [x] **Step 1: Pass search query to EventCard**

`App.tsx` now passes `query` into each event card.

- [x] **Step 2: Render highlighted title and preview**

`EventCard` uses `HighlightedText` for title and preview.

- [x] **Step 3: Add component test**

`EventCard.test.tsx` verifies matched text renders as `<mark>`.

### Task 3: Window Cleanup Controls

**Files:**
- Modify: `src/components/SettingsView.tsx`
- Modify: `src/App.tsx`

- [x] **Step 1: Add clear-window callback**

`SettingsView` accepts `onClearWindow(windowMinutes)`.

- [x] **Step 2: Add cleanup buttons**

Settings now exposes `Clear 30 min`, `Clear 24 h`, and `Clear all`.

- [x] **Step 3: Reuse existing API**

`App.tsx` calls `eventApi.clearEvents({ windowMinutes })` and refreshes the timeline.

### Task 4: Verification

- [x] **Step 1: Run targeted tests**

Run: `npm.cmd test -- src/lib/highlight.test.ts src/components/EventCard.test.tsx`

Result: passed.

- [x] **Step 2: Run all tests**

Run: `npm.cmd test`

Result: 12 test files passed, 39 tests passed.

- [x] **Step 3: Run production build**

Run: `npm.cmd run build`

Result: build passed.
