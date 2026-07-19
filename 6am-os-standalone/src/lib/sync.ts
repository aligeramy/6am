import { useEffect, useState } from "react";
import { useOSStore } from "./store";

const META_KEY = "6am-os-sync";
const LASTMOD_KEY = "6am-os-lastmod";
const PUSH_DEBOUNCE_MS = 2500;
const POLL_INTERVAL_MS = 45_000;

export interface SyncMeta {
  code: string;
  enabled: boolean;
}

export type SyncStatus = "off" | "syncing" | "synced" | "error" | "unavailable";

let status: SyncStatus = "off";
let lastSyncedAt: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function setStatus(s: SyncStatus) {
  status = s;
  if (s === "synced") lastSyncedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  notify();
}

export function getSyncStatus() {
  return { status, lastSyncedAt };
}

export function useSyncStatus() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return getSyncStatus();
}

export function getMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as SyncMeta) : null;
  } catch {
    return null;
  }
}

function setMeta(meta: SyncMeta | null) {
  if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
  else localStorage.removeItem(META_KEY);
}

function getLastMod(): number {
  return Number(localStorage.getItem(LASTMOD_KEY) ?? 0);
}

function setLastMod(n: number) {
  localStorage.setItem(LASTMOD_KEY, String(n));
}

export function generateSyncCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < buf.length; i++) {
    s += chars[buf[i] % chars.length];
    if (i === 4) s += "-";
  }
  return `6am-${s}`;
}

interface SyncPayload {
  lastModified: number;
  state: unknown;
}

async function fetchRemote(code: string): Promise<SyncPayload | null | "unavailable"> {
  try {
    const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    // On a manual (zip) deploy the SPA redirect swallows /api/* and returns HTML.
    if (!res.ok || text.trimStart().startsWith("<")) return "unavailable";
    const parsed = JSON.parse(text);
    if (parsed === null) return null;
    if (typeof parsed !== "object" || typeof parsed.lastModified !== "number") return null;
    return parsed as SyncPayload;
  } catch {
    return "unavailable";
  }
}

async function pushRemote(code: string, payload: SyncPayload): Promise<boolean> {
  try {
    const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const parsed = JSON.parse(await res.text());
    return parsed?.ok === true;
  } catch {
    return false;
  }
}

let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(doPush, PUSH_DEBOUNCE_MS);
}

async function doPush() {
  const meta = getMeta();
  if (!meta?.enabled) return;
  setStatus("syncing");
  const state = JSON.parse(useOSStore.getState().exportData());
  const payload: SyncPayload = { lastModified: getLastMod(), state };
  const ok = await pushRemote(meta.code, payload);
  setStatus(ok ? "synced" : "error");
}

async function doPull() {
  const meta = getMeta();
  if (!meta?.enabled) return;
  setStatus("syncing");
  const remote = await fetchRemote(meta.code);
  if (remote === "unavailable") {
    setStatus("unavailable");
    return;
  }
  if (remote === null) {
    // Nothing stored yet under this code — seed it with our data.
    if (getLastMod() === 0) setLastMod(Date.now());
    await doPush();
    return;
  }
  if (remote.lastModified > getLastMod()) {
    applyingRemote = true;
    try {
      useOSStore.getState().importData(JSON.stringify(remote.state));
      setLastMod(remote.lastModified);
    } finally {
      applyingRemote = false;
    }
    setStatus("synced");
  } else if (remote.lastModified < getLastMod()) {
    await doPush();
  } else {
    setStatus("synced");
  }
}

export async function enableSync(code: string): Promise<SyncStatus> {
  setMeta({ code, enabled: true });
  if (getLastMod() === 0) setLastMod(Date.now());
  await doPull();
  startPolling();
  return status;
}

export function disableSync() {
  setMeta(null);
  stopPolling();
  setStatus("off");
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(doPull, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function initSync() {
  useOSStore.subscribe(() => {
    if (applyingRemote) return;
    setLastMod(Date.now());
    if (getMeta()?.enabled) schedulePush();
  });

  if (getMeta()?.enabled) {
    doPull();
    startPolling();
    window.addEventListener("focus", () => doPull());
  }
}
