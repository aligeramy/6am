import { useMemo, useState } from "react";
import { useOSStore } from "../lib/store";
import {
  SectionHeader,
  DashboardCard,
  Modal,
  FormInput,
  TextArea,
  PrimaryButton,
  SecondaryButton,
  IconButton,
} from "../components/ui";
import { BudgetItem } from "../types/os";
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { parseTags, tagsToInput, fmtMoney } from "../lib/categories";

const emptyForm = { label: "", amount: "", date: "", tags: "", notes: "" };

export default function BudgetSection() {
  const budgetItems = useOSStore((s) => s.budgetItems);
  const addBudgetItem = useOSStore((s) => s.addBudgetItem);
  const updateBudgetItem = useOSStore((s) => s.updateBudgetItem);
  const deleteBudgetItem = useOSStore((s) => s.deleteBudgetItem);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function openCreate(prefillTag = "") {
    setEditing(null);
    setForm({ ...emptyForm, tags: prefillTag ? `#${prefillTag}` : "" });
    setModalOpen(true);
  }

  function openEdit(item: BudgetItem) {
    setEditing(item);
    setForm({
      label: item.label,
      amount: String(item.amount),
      date: item.date,
      tags: tagsToInput(item.tags),
      notes: item.notes,
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.label.trim() || isNaN(amount)) return;
    const payload = {
      label: form.label,
      amount,
      type: "expense" as const,
      category: "Other" as const,
      linkedSongId: null,
      tags: parseTags(form.tags),
      date: form.date,
      notes: form.notes,
    };
    if (editing) {
      updateBudgetItem(editing.id, payload);
    } else {
      addBudgetItem(payload);
    }
    setModalOpen(false);
  }

  const totalInvested = useMemo(() => budgetItems.reduce((s, b) => s + b.amount, 0), [budgetItems]);
  const thisMonth = useMemo(() => {
    const prefix = new Date().toISOString().slice(0, 7);
    return budgetItems.filter((b) => b.date.startsWith(prefix)).reduce((s, b) => s + b.amount, 0);
  }, [budgetItems]);

  const groups = useMemo(() => {
    const byTag = new Map<string, BudgetItem[]>();
    const untagged: BudgetItem[] = [];
    for (const item of budgetItems) {
      const tags = item.tags ?? [];
      if (tags.length === 0) {
        untagged.push(item);
      } else {
        for (const tag of tags) {
          if (!byTag.has(tag)) byTag.set(tag, []);
          byTag.get(tag)!.push(item);
        }
      }
    }
    const result = [...byTag.entries()]
      .map(([tag, items]) => ({ key: tag, label: `#${tag}`, items, total: items.reduce((s, b) => s + b.amount, 0) }))
      .sort((a, b) => b.total - a.total);
    if (untagged.length > 0) {
      result.push({ key: "__untagged", label: "No hashtag", items: untagged, total: untagged.reduce((s, b) => s + b.amount, 0) });
    }
    return result;
  }, [budgetItems]);

  return (
    <div>
      <SectionHeader
        title="Budget"
        subtitle="Log what you invest. Hashtags connect spending to releases automatically."
        action={
          <PrimaryButton onClick={() => openCreate()}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Add Entry
            </span>
          </PrimaryButton>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4">
        <DashboardCard>
          <div className="text-xs uppercase tracking-wide text-[#a3a3a3]">Total Invested</div>
          <div className="mt-2 text-2xl font-semibold text-[#f5f5f5]">{fmtMoney(totalInvested)}</div>
        </DashboardCard>
        <DashboardCard>
          <div className="text-xs uppercase tracking-wide text-[#a3a3a3]">This Month</div>
          <div className="mt-2 text-2xl font-semibold text-[#f5f5f5]">{fmtMoney(thisMonth)}</div>
        </DashboardCard>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-6 py-12 text-center">
          <p className="text-sm text-[#a3a3a3]">
            Nothing logged yet. Add an entry like "Mix + master · $300 · #june26" and it links itself to that release.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = !collapsed[group.key];
            const sorted = [...group.items].sort((a, b) => (b.date > a.date ? 1 : -1));
            return (
              <div key={group.key} className="overflow-hidden rounded-2xl border border-[#2a2a2a]">
                <div
                  onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !c[group.key] }))}
                  className="flex w-full cursor-pointer items-center justify-between bg-[#0c0c0c] px-4 py-3 hover:bg-[#111111]"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={15} className="text-[#a3a3a3]" /> : <ChevronRight size={15} className="text-[#a3a3a3]" />}
                    <span className={`text-sm font-semibold ${group.key === "__untagged" ? "text-[#a3a3a3]" : "text-cyan-300"}`}>
                      {group.label}
                    </span>
                    <span className="text-xs text-[#a3a3a3]">
                      {group.items.length} {group.items.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#f5f5f5]">{fmtMoney(group.total)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreate(group.key === "__untagged" ? "" : group.key);
                      }}
                      className="rounded-lg border border-[#2a2a2a] bg-[#151515] px-2 py-1 text-[#f5f5f5] hover:bg-[#1c1c1c]"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <ul className="divide-y divide-[#1c1c1c] bg-[#111111]">
                    {sorted.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-[#151515]">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-[#f5f5f5]">{item.label}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#a3a3a3]">
                            {item.date && <span>{item.date}</span>}
                            {(item.tags ?? []).map((t) => (
                              <span key={t} className="text-cyan-300/80">#{t}</span>
                            ))}
                            {item.notes && <span className="truncate">{item.notes}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-semibold text-[#f5f5f5]">{fmtMoney(item.amount)}</span>
                          <IconButton onClick={() => openEdit(item)}>
                            <Pencil size={14} />
                          </IconButton>
                          <IconButton onClick={() => deleteBudgetItem(item.id)}>
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Entry" : "New Entry"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormInput
            label="What was it"
            required
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. Mix + master, photoshoot, ad spend"
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Amount ($)"
              required
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <FormInput type="date" label="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <FormInput
            label="Hashtags"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="#june26 — same tag as the release it belongs to"
          />
          <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[60px]" />
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit">{editing ? "Save" : "Add"}</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
