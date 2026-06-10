"use client";

import { useRef } from "react";
import { useOSStore } from "@/lib/os/store";
import { SecondaryButton } from "./ui";

export function OSTopBar() {
  const exportData = useOSStore((s) => s.exportData);
  const importData = useOSStore((s) => s.importData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `6am-os-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(String(reader.result));
      if (!ok) alert("Invalid JSON file.");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="flex items-center justify-end gap-2 border-b border-[#2a2a2a] bg-[#050505] px-6 py-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChange}
      />
      <SecondaryButton onClick={handleImportClick}>Import JSON</SecondaryButton>
      <SecondaryButton onClick={handleExport}>Export JSON</SecondaryButton>
    </div>
  );
}
