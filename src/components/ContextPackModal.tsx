import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { IconCheck, IconCopy, IconDeviceFloppy, IconX } from "@tabler/icons-react";

interface ContextPackModalProps {
  markdown: string;
  title?: string;
  description?: string;
  defaultFilename?: string;
  onClose: () => void;
}

export function ContextPackModal({
  markdown,
  title = "Context pack",
  description = "Markdown ready for AI, teammates, or your own notes.",
  defaultFilename = "thirty-minute-brain-context.md",
  onClose
}: ContextPackModalProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const saveMarkdown = async () => {
    if ("__TAURI_INTERNALS__" in window) {
      const path = await save({
        defaultPath: defaultFilename,
        filters: [{ name: "Markdown", extensions: ["md"] }]
      });
      if (path) await writeTextFile(path, markdown);
      return;
    }

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = defaultFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Context pack">
      <div className="modal-panel max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-zinc-400">{description}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Close">
            <IconX size={18} stroke={1.8} />
          </button>
        </div>
        <pre className="max-h-[56vh] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-200">
          {markdown}
        </pre>
        <div className="mt-5 flex justify-end gap-2">
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
          <button className="secondary-button" type="button" onClick={saveMarkdown}>
            <IconDeviceFloppy size={18} stroke={1.8} />
            Save .md
          </button>
          <button className="primary-button" type="button" onClick={copy}>
            {copied ? <IconCheck size={18} stroke={1.8} /> : <IconCopy size={18} stroke={1.8} />}
            {copied ? "Copied" : "Copy markdown"}
          </button>
        </div>
      </div>
    </div>
  );
}
