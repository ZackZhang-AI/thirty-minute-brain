import { describe, expect, it } from "vitest";
import { normalizeCreateEventRequest } from "./ingestion";

describe("normalizeCreateEventRequest", () => {
  it("accepts browser tab events without reading browser history", () => {
    const normalized = normalizeCreateEventRequest({
      type: "browser_tab",
      title: "Stripe docs",
      url: "https://stripe.com/docs",
      source: "browser_extension"
    });

    expect(normalized.type).toBe("browser_tab");
    expect(normalized.url).toBe("https://stripe.com/docs");
    expect(normalized.metadataJson).toContain("browser_extension");
  });

  it("rejects unsupported event types", () => {
    expect(() =>
      normalizeCreateEventRequest({
        // @ts-expect-error runtime validation covers plugin input
        type: "browser_history",
        title: "History dump",
        source: "browser_extension"
      })
    ).toThrow("Unsupported event type");
  });

  it("requires a URL for browser tab events and a path for editor file events", () => {
    expect(() =>
      normalizeCreateEventRequest({
        type: "browser_tab",
        title: "Missing URL",
        source: "browser_extension"
      })
    ).toThrow("requires url");

    expect(() =>
      normalizeCreateEventRequest({
        type: "editor_file",
        title: "Missing path",
        source: "vscode_extension"
      })
    ).toThrow("requires path");
  });

  it("enforces source permissions for external workflow integrations", () => {
    expect(() =>
      normalizeCreateEventRequest({
        type: "command",
        title: "pwd",
        content: "pwd",
        source: "browser_extension"
      })
    ).toThrow("browser_extension cannot create command events");

    expect(() =>
      normalizeCreateEventRequest({
        type: "browser_tab",
        title: "Docs",
        url: "https://example.com",
        source: "vscode_extension"
      })
    ).toThrow("vscode_extension cannot create browser_tab events");

    expect(() =>
      normalizeCreateEventRequest({
        type: "note",
        title: "unknown",
        content: "hello",
        source: "unknown_plugin"
      })
    ).toThrow("Unauthorized event source");
  });

  it("accepts editor file, editor selection, and shell command events", () => {
    expect(
      normalizeCreateEventRequest({
        type: "editor_file",
        title: "App.tsx",
        path: "C:\\project\\src\\App.tsx",
        source: "vscode_extension",
        metadataJson: JSON.stringify({ workspace: "project", language: "typescript" })
      }).metadataJson
    ).toContain("typescript");

    expect(
      normalizeCreateEventRequest({
        type: "editor_selection",
        title: "Selected TypeScript",
        content: "const value = 1",
        path: "C:\\project\\src\\App.tsx",
        source: "vscode_extension",
        metadataJson: JSON.stringify({ selectionPreview: "const value = 1" })
      }).content
    ).toBe("const value = 1");

    expect(
      normalizeCreateEventRequest({
        type: "command",
        title: "git status",
        content: "git status",
        source: "shell_hook",
        metadataJson: JSON.stringify({ shell: "powershell" })
      }).type
    ).toBe("command");
  });

  it("rejects browser history and terminal history sources", () => {
    expect(() =>
      normalizeCreateEventRequest({
        type: "browser_tab",
        title: "History dump",
        url: "https://example.com",
        source: "browser_history"
      })
    ).toThrow("Unauthorized event source");

    expect(() =>
      normalizeCreateEventRequest({
        type: "command",
        title: "terminal history",
        content: "cat ~/.bash_history",
        source: "terminal_history"
      })
    ).toThrow("Unauthorized event source");
  });

  it("strips terminal output metadata from shell hook events", () => {
    const normalized = normalizeCreateEventRequest({
      type: "command",
      title: "npm test",
      content: "npm test",
      source: "shell_hook",
      metadataJson: JSON.stringify({
        shell: "bash",
        stdout: "full command output",
        stderr: "secret output",
        output: "combined output"
      })
    });

    expect(normalized.metadataJson).toContain("bash");
    expect(normalized.metadataJson).not.toContain("full command output");
    expect(normalized.metadataJson).not.toContain("secret output");
    expect(normalized.metadataJson).not.toContain("combined output");
  });
});

