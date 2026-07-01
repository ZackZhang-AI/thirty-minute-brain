import { describe, expect, it } from "vitest";
import {
  canSourceIngest,
  createDefaultPermissionSettings,
  getSourceCatalog,
  updateSourcePermission
} from "./permissions";

describe("permission center model", () => {
  it("describes what each source collects and does not collect", () => {
    const catalog = getSourceCatalog();

    expect(catalog.browser_extension.collects).toContain("Current active tab title and URL");
    expect(catalog.browser_extension.doesNotCollect).toContain("Full browser history");
    expect(catalog.shell_hook.doesNotCollect).toContain("Command output");
  });

  it("disables external integrations by default", () => {
    const settings = createDefaultPermissionSettings();

    expect(settings.sources.manual.enabled).toBe(true);
    expect(settings.sources.clipboard.enabled).toBe(true);
    expect(settings.sources.browser_extension.enabled).toBe(false);
    expect(settings.sources.vscode_extension.enabled).toBe(false);
    expect(settings.sources.shell_hook.enabled).toBe(false);
  });

  it("allows only enabled sources and matching event types", () => {
    let settings = createDefaultPermissionSettings();
    settings = updateSourcePermission(settings, "browser_extension", { enabled: true });

    expect(canSourceIngest(settings, "browser_extension", "browser_tab")).toBe(true);
    expect(canSourceIngest(settings, "browser_extension", "command")).toBe(false);
    expect(canSourceIngest(settings, "shell_hook", "command")).toBe(false);
  });

  it("global pause stops automatic and external capture but keeps manual add available", () => {
    const settings = {
      ...createDefaultPermissionSettings(),
      globalPaused: true
    };

    expect(canSourceIngest(settings, "clipboard", "clipboard")).toBe(false);
    expect(canSourceIngest(settings, "browser_extension", "browser_tab")).toBe(false);
    expect(canSourceIngest(settings, "manual", "note")).toBe(true);
  });

  it("records source write timestamps without mutating the previous object", () => {
    const settings = createDefaultPermissionSettings();
    const updated = updateSourcePermission(settings, "clipboard", {
      lastWriteAt: "2026-07-01T01:00:00.000Z"
    });

    expect(settings.sources.clipboard.lastWriteAt).toBeNull();
    expect(updated.sources.clipboard.lastWriteAt).toBe("2026-07-01T01:00:00.000Z");
  });
});
