import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventCard } from "./EventCard";
import type { MemoryEvent } from "../lib/types";

const baseEvent: MemoryEvent = {
  id: "event-1",
  type: "clipboard",
  title: "Stripe webhook TypeError",
  content: "TypeError in webhook callback",
  source: "clipboard",
  path: null,
  url: null,
  note: null,
  metadataJson: null,
  contentHash: null,
  sensitiveFlag: false,
  sensitiveReason: null,
  createdAt: "2026-06-30T10:21:00.000Z",
  expiresAt: "2026-07-01T10:21:00.000Z",
  pinnedAt: null
};

describe("EventCard", () => {
  it("lets the user select an event without opening details", () => {
    const onSelectedChange = vi.fn();

    render(
      <EventCard
        event={baseEvent}
        selected={false}
        onSelectedChange={onSelectedChange}
        onDelete={vi.fn()}
        onPin={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText("Select Stripe webhook TypeError"));

    expect(onSelectedChange).toHaveBeenCalledWith("event-1");
  });
});
