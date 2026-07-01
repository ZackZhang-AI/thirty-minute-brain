import { canSourceIngest } from "./permissions";
import type { AppSettings } from "./settings";

export function canCaptureClipboard(settings: AppSettings): boolean {
  return settings.clipboardEnabled && canSourceIngest(settings.permissions, "clipboard", "clipboard");
}
