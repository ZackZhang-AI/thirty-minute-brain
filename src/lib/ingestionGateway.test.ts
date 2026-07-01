import { describe, expect, it } from "vitest";
import { createIngestionGateway } from "./ingestionGateway";
import { createLocalEventStore } from "./localStore";
import { createDefaultPermissionSettings, updateSourcePermission } from "./permissions";

describe("createIngestionGateway", () => {
  it("rejects external events with an invalid ingestion token", async () => {
    const store = createLocalEventStore();
    const permissions = updateSourcePermission(createDefaultPermissionSettings(), "browser_extension", { enabled: true });
    const gateway = createIngestionGateway({
      store,
      getSettings: () => ({ ingestionToken: "secret-token", permissions })
    });

    await expect(
      gateway.ingest({
        token: "wrong-token",
        event: {
          type: "browser_tab",
          title: "Docs",
          url: "https://example.com",
          source: "browser_extension"
        }
      })
    ).rejects.toThrow("Invalid ingestion token");
  });

  it("rejects disabled external sources before writing events", async () => {
    const store = createLocalEventStore();
    const gateway = createIngestionGateway({
      store,
      getSettings: () => ({ ingestionToken: "secret-token", permissions: createDefaultPermissionSettings() })
    });

    await expect(
      gateway.ingest({
        token: "secret-token",
        event: {
          type: "browser_tab",
          title: "Docs",
          url: "https://example.com",
          source: "browser_extension"
        }
      })
    ).rejects.toThrow("Source browser_extension is disabled");

    await expect(store.listRecentEvents({ windowMinutes: 24 * 60 })).resolves.toHaveLength(0);
  });

  it("respects global pause for automatic and external ingestion", async () => {
    const store = createLocalEventStore();
    const permissions = updateSourcePermission(
      {
        ...createDefaultPermissionSettings(),
        globalPaused: true
      },
      "browser_extension",
      { enabled: true }
    );
    const gateway = createIngestionGateway({
      store,
      getSettings: () => ({ ingestionToken: "secret-token", permissions })
    });

    await expect(
      gateway.ingest({
        token: "secret-token",
        event: {
          type: "browser_tab",
          title: "Docs",
          url: "https://example.com",
          source: "browser_extension"
        }
      })
    ).rejects.toThrow("Ingestion is paused");
  });

  it("rejects source and event type mismatches", async () => {
    const store = createLocalEventStore();
    const permissions = updateSourcePermission(createDefaultPermissionSettings(), "browser_extension", { enabled: true });
    const gateway = createIngestionGateway({
      store,
      getSettings: () => ({ ingestionToken: "secret-token", permissions })
    });

    await expect(
      gateway.ingest({
        token: "secret-token",
        event: {
          type: "command",
          title: "pwd",
          content: "pwd",
          source: "browser_extension"
        }
      })
    ).rejects.toThrow("browser_extension cannot create command events");
  });

  it("ingests enabled events through sensitive filtering and stable de-duplication", async () => {
    const store = createLocalEventStore();
    const permissions = updateSourcePermission(createDefaultPermissionSettings(), "shell_hook", { enabled: true });
    const gateway = createIngestionGateway({
      store,
      getSettings: () => ({ ingestionToken: "secret-token", permissions })
    });

    const first = await gateway.ingest({
      token: "secret-token",
      event: {
        type: "command",
        title: "export token",
        content: "export OPENAI_API_KEY=sk-test123456789012345678901234567890123456789012",
        source: "shell_hook",
        metadataJson: JSON.stringify({ shell: "bash", stdout: "never store this output" })
      }
    });
    const second = await gateway.ingest({
      token: "secret-token",
      event: {
        type: "command",
        title: "export token",
        content: "export OPENAI_API_KEY=sk-test123456789012345678901234567890123456789012",
        source: "shell_hook",
        metadataJson: JSON.stringify({ shell: "bash", stdout: "never store this output" })
      }
    });

    expect(second.id).toBe(first.id);
    expect(first.sensitiveFlag).toBe(true);
    expect(first.title).toBe("敏感内容已跳过");
    expect(first.content).toBeNull();
    expect(first.metadataJson).toContain("bash");
    expect(first.metadataJson).not.toContain("never store this output");
    await expect(store.listRecentEvents({ windowMinutes: 24 * 60 })).resolves.toHaveLength(1);
  });

  it("reports successful source writes for the permission center", async () => {
    const store = createLocalEventStore();
    const permissions = updateSourcePermission(createDefaultPermissionSettings(), "browser_extension", { enabled: true });
    const writes: Array<{ source: string; writtenAt: string }> = [];
    const gateway = createIngestionGateway({
      store,
      now: () => new Date("2026-07-01T02:00:00.000Z"),
      getSettings: () => ({ ingestionToken: "secret-token", permissions }),
      onSourceWrite: (source, writtenAt) => writes.push({ source, writtenAt })
    });

    await gateway.ingest({
      token: "secret-token",
      event: {
        type: "browser_tab",
        title: "Docs",
        url: "https://example.com",
        source: "browser_extension"
      }
    });

    expect(writes).toEqual([{ source: "browser_extension", writtenAt: "2026-07-01T02:00:00.000Z" }]);
  });
});
