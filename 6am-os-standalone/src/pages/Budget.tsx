import { useMemo, useState } from "react";
import { useOSStore } from "../lib/store";
import {
  SectionHeader,
  DashboardCard,
  Modal,
  FormInput,
  Select,
  TextArea,
  PrimaryButton,
  SecondaryButton,
  IconButton,
} from "../components/ui";
import { BUDGET_CATEGORIES, BudgetCategory, BudgetItem } from "../types/os";
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from "lucide-react";

const emptyForm = {
  label: "",
  amount: "",
  type: "expense" as "income" | "expense",
  category: "Other" as BudgetCategory,
  linkedSongId: "",
  date: "",
  notes: "",
};

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function NetBadge({ net }: { net: number }) {
  return (
    <span className={`text-sm font-semibold ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
      {net < 0 ? "-" : "+"}{fmt(Math.abs(net))}
    </span>
  );
}

export default function BudgetPage() {
  const budgetItems = useOSStore((s) => s.budgetItems);
  const songs = useOSStore((s) => s.songs);
  const addBudgetItem = useOSStore((s) => s.addBudgetItem);
  const updateBudgetItem = useOSStore((s) => s.updateBudgetItem);
  const deleteBudgetItem = useOSStore((s) => s.deleteBudgetItem);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function openCreate(linkedSongId = "") {
    setEditing(null);
    setForm({ ...emptyForm, linkedSongId });
    setModalOpen(true);
  }

  function openEdit(item: BudgetItem) {
    setEditing(item);
    setForm({
      label: item.label,
      amount: String(item.amount),
      type: item.type,
      category: item.category,
      linkedSongId: item.linkedSongId ?? "",
      date: item.date,
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
      type: form.type,
      category: form.category,
      linkedSongId: form.linkedSongId || null,
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

  const { totalIncome, totalExpenses, net } = useMemo(() => {
    const totalIncome = budgetItems.filter((b) => b.type === "income").reduce((s, b) => s + b.amount, 0);
    const totalExpenses = budgetItems.filter((b) => b.type === "expense").reduce((s, b) => s + b.amount, 0);
    return { totalIncome, totalExpenses, net: totalIncome - totalExpenses };
  }, [budgetItems]);

  const groups = useMemo(() => {
    const songMap = new Map<string, BudgetItem[]>();
    const general: BudgetItem[] = [];
    for (const item of budgetItems) {
      if (item.linkedSongId) {
        if (!songMap.has(item.linkedSongId)) songMap.set(item.linkedSongId, []);
        songMap.get(item.linkedSongId)!.push(item);
      } else {
        general.push(item);
      }
    }
    const result: { key: string; label: string; items: BudgetItem[] }[] = [];
    songMap.forEach((items, songId) => {
      const song = songs.find((s) => s.id === songId);
      result.push({ key: songId, label: song?.title ?? "Unknown Song", items });
    });
    result.sort((a, b) => a.label.localeCompare(b.label));
    if (general.length > 0) result.push({ key: "general", label: "General", items: general });
    return result;
  }, [budgetItems, songs]);

  function toggleCollapse(key: string) {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  }

  function groupNet(items: BudgetItem[]) {
    return items.reduce((s, b) => s + (b.type === "income" ? b.amount : -b.amount), 0);
  }

  return (
    <div>
      <SectionHeader
        title="Budget"
        subtitle="Track income and expenses per song."
        action={
          <PrimaryButton onClick={() => openCreate()}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Add Entry
            </span>
          </PrimaryButton>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#a3a3a3]">
            <TrendingUp size={14} className="text-emerald-400" /> Total Income
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-400">{fmt(totalIncome)}</div>
        </DashboardCard>
        <DashboardCard>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#a3a3a3]">
            <TrendingDown size={14} className="text-red-400" /> Total Expenses
          </div>
          <div className="mt-2 text-2xl font-semibold text-red-400">{fmt(totalExpenses)}</div>
        </DashboardCard>
        <DashboardCard>
          <div className="text-xs uppercase tracking-wide text-[#a3a3a3]">Net</div>
          <div className={`mt-2 text-2xl font-semibold ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {net < 0 ? "-" : ""}{fmt(Math.abs(net))}
          </div>
        </DashboardCard>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-6 py-12 text-center">
          <p className="text-sm text-[#a3a3a3]">No entries yet. Add income or expenses to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = !collapsed[group.key];
            const gnet = groupNet(group.items);
            const gIncome = group.items.filter((b) => b.type === "income").reduce((s, b) => s + b.amount, 0);
            const gExpenses = group.items.filter((b) => b.type === "expense").reduce((s, b) => s + b.amount, 0);
            const sorted = [...group.items].sort((a, b) => (b.date > a.date ? 1 : -1));
            return (
              <div key={group.key} className="overflow-hidden rounded-2xl border border-[#2a2a2a]">
                <div
                  onClick={() => toggleCollapse(group.key)}
                  className="flex w-full cursor-pointer items-center justify-between bg-[#0c0c0c] px-4 py-3 text-left hover:bg-[#111111]"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={15} className="text-[#a3a3a3]" /> : <ChevronRight size={15} className="text-[#a3a3a3]" />}
                    <span className="text-sm font-semibold text-[#f5f5f5]">{group.label}</span>
                    <span className="text-xs text-[#a3a3a3]">{group.items.length} {group.items.length === 1 ? "entry" : "entries"}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#a3a3a3]">
                    <span className="text-emerald-400">+{fmt(gIncome)}</span>
                    <span className="text-red-400">-{fmt(gExpenses)}</span>
                    <NetBadge net={gnet} />
                    <button
                      onClick={(e) => { e.stopPropagation(); openCreate(group.key === "general" ? "" : group.key); }}
                      className="ml-2 rounded-lg border border-[#2a2a2a] bg-[#151515] px-2 py-1 text-[#f5f5f5] hover:bg-[#1c1c1c]"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <table className="w-full text-sm">
                    <thead className="bg-[#0a0a0a] text-xs uppercase tracking-wide text-[#a3a3a3]">
                      <tr>
                        <th className="px-4 py-2 text-left">Label</th>
                        <th className="px-4 py-2 text-left">Category</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c1c1c] bg-[#111111]">
                      {sorted.map((item) => (
                        <tr key={item.id} className="hover:bg-[#151515]">
                          <td className="px-4 py-3">
                            <div className="font-medium text-[#f5f5f5]">{item.label}</div>
                            {item.notes && <div className="mt-0.5 text-xs text-[#a3a3a3]">{item.notes}</div>}
                          </td>
                          <td className="px-4 py-3 text-[#a3a3a3]">{item.category}</td>
                          <td className="px-4 py-3 text-[#a3a3a3]">{item.date || "—"}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${item.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                            {item.type === "income" ? "+" : "-"}{fmt(item.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <IconButton onClick={() => openEdit(item)}><Pencil size={14} /></IconButton>
                              <IconButton onClick={() => deleteBudgetItem(item.id)}><Trash2 size={14} /></IconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Entry" : "New Entry"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormInput label="Label" required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Studio time, Spotify royalty" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "income" | "expense" })}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </Select>
            <FormInput label="Amount ($)" required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as BudgetCategory })}>
              {BUDGET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <FormInput type="date" label="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <Select label="Song" value={form.linkedSongId} onChange={(e) => setForm({ ...form, linkedSongId: e.target.value })}>
            <option value="">General (no song)</option>
            {songs.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </Select>
          <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton type="submit">{editing ? "Save" : "Add"}</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
