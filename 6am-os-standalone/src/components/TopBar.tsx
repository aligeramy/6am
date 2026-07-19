import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { useOSStore } from "../lib/store";

export function TopBar() {
  const exportData = useOSStore((s) => s.exportData);
  const importData = useOSStore((s) => s.importData);
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <header className="flex items-center justify-end gap-2 border-b border-[#2a2a2a] bg-[#080808] px-4 py-2.5 sm:px-6">
      <button
        onClick={handleExport}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#151515] px-3 py-1.5 text-xs font-medium text-[#f5f5f5] hover:bg-[#1c1c1c]"
      >
        <Download size={14} /> Export JSON
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#151515] px-3 py-1.5 text-xs font-medium text-[#f5f5f5] hover:bg-[#1c1c1c]"
      >
        <Upload size={14} /> Import JSON
      </button>
      <input ref={fileRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
    </header>
  );
}
