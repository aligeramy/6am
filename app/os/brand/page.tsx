"use client";

import { useState } from "react";
import { useOSStore } from "@/lib/os/store";
import { DashboardCard, SectionHeader, TextArea, PrimaryButton } from "@/components/os/ui";

export default function BrandPage() {
  const brand = useOSStore((s) => s.brand);
  const updateBrandNote = useOSStore((s) => s.updateBrandNote);

  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(brand.map((b) => [b.id, b.content]))
  );
  const [savedId, setSavedId] = useState<string | null>(null);

  function save(id: string) {
    updateBrandNote(id, { content: drafts[id] });
    setSavedId(id);
    setTimeout(() => setSavedId(null), 1500);
  }

  return (
    <div>
      <SectionHeader title="Brand" subtitle="Keep the 6am brand consistent across releases and content." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {brand.map((note) => (
          <DashboardCard key={note.id} title={note.title}>
            <TextArea
              value={drafts[note.id] ?? ""}
              onChange={(e) => setDrafts({ ...drafts, [note.id]: e.target.value })}
              className="min-h-[220px]"
            />
            <div className="mt-3 flex items-center gap-3">
              <PrimaryButton onClick={() => save(note.id)}>Save</PrimaryButton>
              {savedId === note.id && <span className="text-xs text-cyan-300">Saved</span>}
            </div>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
