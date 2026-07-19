import React from "react";
import { X, Search } from "lucide-react";
import { Priority } from "../types/os";

export function DashboardCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5 ${className ?? ""}`}>
      {title && <h2 className="mb-3 text-sm font-semibold text-[#f5f5f5]">{title}</h2>}
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4 text-left ${
        onClick ? "cursor-pointer transition-colors hover:border-[#3a3a3a] hover:bg-[#151515]" : ""
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-[#a3a3a3]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent ?? "text-[#f5f5f5]"}`}>{value}</div>
    </Tag>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#1c1c1c]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Planning: "bg-slate-500/20 text-slate-300",
  "Pre-release": "bg-violet-500/20 text-violet-300",
  "Release Week": "bg-amber-500/20 text-amber-300",
  Released: "bg-emerald-500/20 text-emerald-300",
  "Post-release": "bg-cyan-500/20 text-cyan-300",
  Archived: "bg-neutral-500/20 text-neutral-400",
  Idea: "bg-slate-500/20 text-slate-300",
  Scripted: "bg-violet-500/20 text-violet-300",
  Filmed: "bg-amber-500/20 text-amber-300",
  Edited: "bg-orange-500/20 text-orange-300",
  Scheduled: "bg-cyan-500/20 text-cyan-300",
  Posted: "bg-emerald-500/20 text-emerald-300",
  Reviewed: "bg-teal-500/20 text-teal-300",
  Raw: "bg-slate-500/20 text-slate-300",
  Useful: "bg-cyan-500/20 text-cyan-300",
  Promoted: "bg-emerald-500/20 text-emerald-300",
  Todo: "bg-slate-500/20 text-slate-300",
  "In Progress": "bg-amber-500/20 text-amber-300",
  Done: "bg-emerald-500/20 text-emerald-300",
  Parked: "bg-neutral-500/20 text-neutral-400",
  Draft: "bg-slate-500/20 text-slate-300",
  Final: "bg-emerald-500/20 text-emerald-300",
  "Needs Review": "bg-amber-500/20 text-amber-300",
};

export function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-slate-500/20 text-slate-300";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  High: "bg-red-500/20 text-red-300",
  Medium: "bg-amber-500/20 text-amber-300",
  Low: "bg-slate-500/20 text-slate-300",
};

export function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
      {priority}
    </span>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#f5f5f5]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#a3a3a3]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#f5f5f5]">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#a3a3a3] hover:bg-[#1c1c1c] hover:text-[#f5f5f5]">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#6b6b6b] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40";

export function FormInput({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-[#a3a3a3]">{label}</span>}
      <input {...props} className={`${inputClass} ${props.className ?? ""}`} />
    </label>
  );
}

export function TextArea({ label, ...props }: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-[#a3a3a3]">{label}</span>}
      <textarea {...props} className={`min-h-[80px] resize-y ${inputClass} ${props.className ?? ""}`} />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: { label?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-[#a3a3a3]">{label}</span>}
      <select {...props} className={`${inputClass} ${props.className ?? ""}`}>
        {children}
      </select>
    </label>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#2a2a2a] px-6 py-10 text-center">
      <p className="text-sm font-medium text-[#f5f5f5]">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-[#a3a3a3]">{subtitle}</p>}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pl-9`}
      />
    </div>
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg bg-violet-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg border border-[#2a2a2a] bg-[#151515] px-4 py-2 text-sm font-medium text-[#f5f5f5] transition-colors hover:bg-[#1c1c1c] ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg p-1.5 text-[#a3a3a3] transition-colors hover:bg-[#1c1c1c] hover:text-[#f5f5f5] ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
