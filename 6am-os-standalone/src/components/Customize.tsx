import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Modal } from "./ui";
import { useOSStore } from "../lib/store";
import { CustomField } from "../types/os";

function ChipListEditor({
  title,
  hint,
  items,
  onChange,
  minItems = 1,
}: {
  title: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  minItems?: number;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft("");
  }

  function remove(item: string) {
    if (items.length <= minItems) return;
    onChange(items.filter((i) => i !== item));
  }

  return (
    <div>
      <div className="mb-1 text-xs font-medium text-[#a3a3a3]">{title}</div>
      {hint && <p className="mb-2 text-[11px] text-[#6b6b6b]">{hint}</p>}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-full border border-[#2a2a2a] bg-[#151515] px-2.5 py-1 text-xs text-[#f5f5f5]"
          >
            {item}
            {items.length > minItems && (
              <button onClick={() => remove(item)} className="text-[#6b6b6b] hover:text-red-300">
                <X size={11} />
              </button>
            )}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add new..."
          className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-1.5 text-xs text-[#f5f5f5] placeholder:text-[#6b6b6b] focus:border-violet-500/60 focus:outline-none"
        />
        <button
          onClick={add}
          className="rounded-lg border border-[#2a2a2a] bg-[#151515] px-2.5 py-1.5 text-xs text-[#f5f5f5] hover:bg-[#1c1c1c]"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

export function CustomizeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useOSStore((s) => s.settings);
  const updateSettings = useOSStore((s) => s.updateSettings);
  const [fieldDraft, setFieldDraft] = useState("");

  function addField() {
    const name = fieldDraft.trim();
    if (!name || settings.customFields.some((f) => f.name === name)) return;
    const field: CustomField = { id: `field-${Date.now()}`, name };
    updateSettings({ customFields: [...settings.customFields, field] });
    setFieldDraft("");
  }

  function removeField(id: string) {
    updateSettings({ customFields: settings.customFields.filter((f) => f.id !== id) });
  }

  return (
    <Modal open={open} onClose={onClose} title="Customize">
      <div className="space-y-5">
        <ChipListEditor
          title="Board stages (columns)"
          hint="Items keep their stage even if you remove it — they'll show in an extra column."
          items={settings.stages}
          onChange={(stages) => updateSettings({ stages })}
        />
        <ChipListEditor
          title="Priorities"
          items={settings.priorities}
          onChange={(priorities) => updateSettings({ priorities })}
        />
        <ChipListEditor
          title="Item types"
          hint="Songs, music videos, or any other project type you work on."
          items={settings.itemTypes}
          onChange={(itemTypes) => updateSettings({ itemTypes })}
        />
        <div>
          <div className="mb-1 text-xs font-medium text-[#a3a3a3]">Custom fields</div>
          <p className="mb-2 text-[11px] text-[#6b6b6b]">
            Extra fields that appear on every board item (e.g. "Deadline", "Label contact", "Version").
          </p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {settings.customFields.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 rounded-full border border-[#2a2a2a] bg-[#151515] px-2.5 py-1 text-xs text-[#f5f5f5]"
              >
                {f.name}
                <button onClick={() => removeField(f.id)} className="text-[#6b6b6b] hover:text-red-300">
                  <X size={11} />
                </button>
              </span>
            ))}
            {settings.customFields.length === 0 && <span className="text-xs text-[#6b6b6b]">None yet.</span>}
          </div>
          <div className="flex gap-2">
            <input
              value={fieldDraft}
              onChange={(e) => setFieldDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addField())}
              placeholder="Field name..."
              className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-1.5 text-xs text-[#f5f5f5] placeholder:text-[#6b6b6b] focus:border-violet-500/60 focus:outline-none"
            />
            <button
              onClick={addField}
              className="rounded-lg border border-[#2a2a2a] bg-[#151515] px-2.5 py-1.5 text-xs text-[#f5f5f5] hover:bg-[#1c1c1c]"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
