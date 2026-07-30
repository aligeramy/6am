import { useRef, useState } from "react";
import { Download, Upload, Cloud, CloudOff, Copy, Check, Settings2 } from "lucide-react";
import { useOSStore } from "../lib/store";
import { Modal, PrimaryButton, SecondaryButton, FormInput } from "../components/ui";
import { useSyncStatus, getMeta, generateSyncCode, enableSync, disableSync } from "../lib/sync";
import { CustomizeModal } from "./Customize";

const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "board", label: "Board" },
  { id: "calendar", label: "Calendar" },
  { id: "budget", label: "Budget" },
];

function scrollToSection(id: string) {
  if (id === "home") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }
}

function SyncModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { status, lastSyncedAt } = useSyncStatus();
  const meta = getMeta();
  const [codeInput, setCodeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setBusy(true);
    await enableSync(generateSyncCode());
    setBusy(false);
  }

  async function handleConnect() {
    const code = codeInput.trim();
    if (!code) return;
    setBusy(true);
    await enableSync(code);
    setBusy(false);
  }

  function handleCopy() {
    if (!meta?.code) return;
    navigator.clipboard.writeText(meta.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal open={open} onClose={onClose} title="Device Sync">
      {meta?.enabled ? (
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-xs font-medium text-[#a3a3a3]">Your sync code</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-sm text-[#f5f5f5]">
                {meta.code}
              </code>
              <SecondaryButton onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </SecondaryButton>
            </div>
            <p className="mt-2 text-xs text-[#a3a3a3]">
              Enter this same code on your other device (iPhone or laptop) and both will stay in sync automatically.
              Keep it private — anyone with the code can see your data.
            </p>
          </div>

          <div className="rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-xs">
            {status === "synced" && <span className="text-emerald-400">✓ Synced{lastSyncedAt ? ` · ${lastSyncedAt}` : ""}</span>}
            {status === "syncing" && <span className="text-amber-300">Syncing…</span>}
            {status === "error" && <span className="text-red-300">Sync error — will retry on your next change.</span>}
            {status === "unavailable" && (
              <span className="text-amber-300">
                Cloud sync isn't available on this deploy. It works when the site is deployed on Netlify via
                "Import from Git" (drag-and-drop zip deploys can't run the sync service). Your data is still saved
                on this device.
              </span>
            )}
          </div>

          <div className="flex justify-end">
            <SecondaryButton onClick={() => disableSync()}>Turn off sync</SecondaryButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[#a3a3a3]">
            Sync keeps your data identical on your iPhone and laptop. Start it on one device, then enter the same
            code on the other.
          </p>
          <PrimaryButton onClick={handleCreate} disabled={busy} className="w-full">
            {busy ? "Starting…" : "Start syncing this device"}
          </PrimaryButton>
          <div className="flex items-center gap-3 text-xs text-[#6b6b6b]">
            <span className="h-px flex-1 bg-[#2a2a2a]" /> or <span className="h-px flex-1 bg-[#2a2a2a]" />
          </div>
          <div className="space-y-2">
            <FormInput
              label="Already have a code from your other device?"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="6am-xxxxx-xxxxx"
            />
            <SecondaryButton onClick={handleConnect} disabled={busy || !codeInput.trim()} className="w-full">
              Connect with code
            </SecondaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function TopBar() {
  const exportData = useOSStore((s) => s.exportData);
  const importData = useOSStore((s) => s.importData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const { status } = useSyncStatus();

  function handleExport() {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `6am-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(String(reader.result));
      if (!ok) alert("Could not import that file. Make sure it's a 6am OS JSON export.");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const syncColor =
    status === "synced" ? "text-emerald-400" : status === "off" ? "text-[#a3a3a3]" : status === "syncing" ? "text-amber-300" : "text-red-300";

  return (
    <header className="sticky top-0 z-40 border-b border-[#2a2a2a] bg-[#080808]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <button onClick={() => scrollToSection("home")} className="text-left transition-opacity hover:opacity-80">
          <div className="text-sm font-semibold tracking-tight text-[#f5f5f5]">6am OS</div>
        </button>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#a3a3a3] transition-colors hover:bg-[#1c1c1c] hover:text-[#f5f5f5]"
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setCustomizeOpen(true)}
            title="Customize stages, priorities, types, and fields"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#151515] px-2.5 py-1.5 text-xs font-medium text-[#a3a3a3] hover:bg-[#1c1c1c] hover:text-[#f5f5f5]"
          >
            <Settings2 size={14} />
          </button>
          <button
            onClick={() => setSyncOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#151515] px-2.5 py-1.5 text-xs font-medium hover:bg-[#1c1c1c] ${syncColor}`}
          >
            {status === "off" || status === "unavailable" ? <CloudOff size={14} /> : <Cloud size={14} />}
            <span className="hidden sm:inline">Sync</span>
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#151515] px-2.5 py-1.5 text-xs font-medium text-[#f5f5f5] hover:bg-[#1c1c1c]"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#151515] px-2.5 py-1.5 text-xs font-medium text-[#f5f5f5] hover:bg-[#1c1c1c]"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Import</span>
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
      <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
      <CustomizeModal open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </header>
  );
}
