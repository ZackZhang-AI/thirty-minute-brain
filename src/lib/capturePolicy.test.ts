import { describe, expect, it } from "vitest";
import { canCaptureClipboard } from "./capturePolicy";
import { createDefaultPermissionSettings, updateSourcePermission } from "./permissions";
import { DEFAULT_SETTINGS } from "./settings";

describe("canCaptureClipboard", () => {
  it("allows clipboard capture when the app toggle and source permission are enabled", () => {
    expect(canCaptureClipboard(DEFAULT_SETTINGS)).toBe(true);
  });

  it("stops clipboard capture when the app toggle is disabled", () => {
    expect(canCaptureClipboard({ ...DEFAULT_SETTINGS, clipboardEnabled: false })).toBe(false);
  });

  it("stops clipboard capture when global pause is enabled", () => {
    expect(
      canCaptureClipboard({
        ...DEFAULT_SETTINGS,
        permissions: {
          ...createDefaultPermissionSettings(),
          globalPaused: true
        }
      })
    ).toBe(false);
  });

  it("stops clipboard capture when the clipboard source is disabled", () => {
    expect(
      canCaptureClipboard({
        ...DEFAULT_SETTINGS,
        permissions: updateSourcePermission(createDefaultPermissionSettings(), "clipboard", { enabled: false })
      })
    ).toBe(false);
  });
});
