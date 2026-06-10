"use client";

import React from "react";
import { Priority } from "@/types/os";

export function DashboardCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5 transition-colors hover:border-[#3a3a3a] ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="text-sm font-medium text-[#f5f5f5]">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
      <div className="text-xs uppercase tracking-wide text-[#a3a3a3]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent ?? "text-[#f5f5f5]"}`}>{value}</div>
    </div>
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

const statusColors: Record<string, string> = {
  Idea: "bg-[#2a2a2a] text-[#a3a3a3]",
  Raw: "bg-[#2a2a2a] text-[#a3a3a3]",
  "Not Started": "bg-[#2a2a2a] text-[#a3a3a3]",
  Planning: "bg-[#2a2a2a] text-[#a3a3a3]",
  "In Progress": "bg-cyan-500/15 text-cyan-300",
  "Pre-release": "bg-cyan-500/15 text-cyan-300",
  Scripted: "bg-cyan-500/15 text-cyan-300",
  Useful: "bg-cyan-500/15 text-cyan-300",
  Filmed: "bg-violet-500/15 text-violet-300",
  Edited: "bg-violet-500/15 text-violet-300",
  "Release Week": "bg-amber-500/15 text-amber-300",
  Scheduled: "bg-violet-500/15 text-violet-300",
  Done: "bg-emerald-500/15 text-emerald-300",
  Released: "bg-emerald-500/15 text-emerald-300",
  Posted: "bg-emerald-500/15 text-emerald-300",
  Promoted: "bg-emerald-500/15 text-emerald-300",
  "Post-release": "bg-emerald-500/15 text-emerald-300",
  Reviewed: "bg-emerald-500/15 text-emerald-300",
  Archived: "bg-[#1c1c1c] text-[#6b6b6b]",
};

export function StatusPill({ status }: { status: string }) {
  const cls = statusColors[status] ?? "bg-[#2a2a2a] text-[#a3a3a3]";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

const priorityColors: Record<Priority, string> = {
  High: "bg-red-500/15 text-red-300",
  Medium: "bg-amber-500/15 text-amber-300",
  Low: "bg-[#2a2a2a] text-[#a3a3a3]",
};

export function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColors[priority]}`}>
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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-[#f5f5f5]">{title}</h1>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#2a2a2a] bg-[#111111] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#f5f5f5]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[#a3a3a3] hover:bg-[#1c1c1c] hover:text-[#f5f5f5]"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SlideOver({
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-[#2a2a2a] bg-[#111111] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#f5f5f5]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[#a3a3a3] hover:bg-[#1c1c1c] hover:text-[#f5f5f5]"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#6b6b6b] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40";

export function FormInput({
  label,
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-[#a3a3a3]">{label}</span>}
      <input className={fieldClass} {...props} />
    </label>
  );
}

export function TextArea({
  label,
  ...props
}: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-[#a3a3a3]">{label}</span>}
      <textarea className={`${fieldClass} min-h-[90px] resize-y`} {...props} />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: { label?: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-[#a3a3a3]">{label}</span>}
      <select className={fieldClass} {...props}>
        {children}
      </select>
    </label>
  );
}

export function DateInput({
  label,
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-[#a3a3a3]">{label}</span>}
      <input type="date" className={fieldClass} {...props} />
    </label>
  );
}

export function Checklist({
  items,
  onToggle,
}: {
  items: { id: string; label: string; done: boolean }[];
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.id}>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#1c1c1c]">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => onToggle(item.id)}
              className="h-4 w-4 rounded border-[#2a2a2a] bg-[#0c0c0c] accent-violet-500"
            />
            <span className={item.done ? "text-[#6b6b6b] line-through" : "text-[#f5f5f5]"}>
              {item.label}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2a2a2a] bg-[#0c0c0c] py-12 text-center">
      <p className="text-sm font-medium text-[#f5f5f5]">{title}</p>
      {subtitle && <p className="mt-1 max-w-xs text-xs text-[#a3a3a3]">{subtitle}</p>}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${fieldClass} max-w-xs`}
    />
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}

export function PrimaryButton({
  children,
  ...props
}: { children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="rounded-lg bg-violet-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: { children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg border border-[#2a2a2a] bg-[#151515] px-4 py-2 text-sm font-medium text-[#f5f5f5] transition-colors hover:bg-[#1c1c1c] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  className = "",
  ...props
}: { children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg p-1.5 text-[#a3a3a3] transition-colors hover:bg-[#1c1c1c] hover:text-[#f5f5f5] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
