import { FormEvent, useState } from "react";
import { IconFile, IconLink, IconX, IconWriting } from "@tabler/icons-react";
import type { NewManualEventInput } from "../lib/types";

interface AddContextModalProps {
  onClose: () => void;
  onSubmit: (input: NewManualEventInput) => Promise<void>;
}

const TYPES = [
  { value: "note", label: "Text", icon: IconWriting },
  { value: "link", label: "Link", icon: IconLink },
  { value: "file", label: "File", icon: IconFile }
] as const;

export function AddContextModal({ onClose, onSubmit }: AddContextModalProps) {
  const [type, setType] = useState<NewManualEventInput["type"]>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    const payload: NewManualEventInput = {
      type,
      title: title.trim() || undefined,
      note: note.trim() || undefined
    };

    if (type === "note") payload.content = content;
    if (type === "link") payload.url = content;
    if (type === "file") payload.path = content;

    await onSubmit(payload);
    setIsSaving(false);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add context">
      <form className="modal-panel" onSubmit={handleSubmit}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Add context</h2>
            <p className="text-sm text-zinc-400">Save a link, note, or file path into your temporary memory.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Close">
            <IconX size={18} stroke={1.8} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                className={type === item.value ? "type-button type-button-active" : "type-button"}
                type="button"
                onClick={() => setType(item.value)}
              >
                <Icon size={18} stroke={1.8} />
                {item.label}
              </button>
            );
          })}
        </div>

        <label className="field-label">
          Title
          <input className="field-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional" />
        </label>

        <label className="field-label">
          {type === "note" ? "Text" : type === "link" ? "URL" : "File path"}
          <textarea
            className="field-textarea"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
            placeholder={type === "note" ? "Paste text or an error message" : type === "link" ? "https://..." : "C:\\project\\file.tsx"}
          />
        </label>

        <label className="field-label">
          Note
          <input className="field-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={isSaving}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

