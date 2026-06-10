import type React from "react";
import { OSSidebar } from "@/components/os/sidebar";
import { OSTopBar } from "@/components/os/topbar";

export const metadata = {
  title: "6am OS — Artist Command Center",
};

export default function OSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#050505] text-[#f5f5f5]">
      <OSSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <OSTopBar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
