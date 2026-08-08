import { ChecklistItem, OSState, defaultSettings } from "../types/os";

const now = new Date().toISOString();

export const RELEASE_CHECKLIST_LABELS = [
  "Reel style hook videos",
  "Visual/music video",
  "Photoshoot",
  "Playlisting",
  "Playlist pitch",
  "YouTube video upload",
];

export const REELS_TARGET = 28;

export function checklist(labels: string[], doneCount = 0): ChecklistItem[] {
  return labels.map((label, i) => ({
    id: `${label}-${i}`.replace(/\s+/g, "-"),
    label,
    done: i < doneCount,
  }));
}

export function buildReleaseChecklist(doneCount = 0): ChecklistItem[] {
  return checklist(RELEASE_CHECKLIST_LABELS, doneCount).map((item, i) =>
    i === 0 ? { ...item, count: doneCount > 0 ? REELS_TARGET : 0, target: REELS_TARGET } : item
  );
}

function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildSeedData(): OSState {
  return {
    songs: [
      {
        id: "seed-main-1",
        title: "June 26",
        stage: "Mastering",
        itemType: "Main Release",
        priority: "High",
        tags: ["june26"],
        releaseDate: inDays(21),
        checklist: buildReleaseChecklist(),
        vibe: "",
        theme: "",
        genre: "house / pop",
        bpm: "",
        key: "",
        collaborators: "",
        producer: "",
        nextAction: "Approve final master",
        releasePotential: "High",
        notes: "This month's official drop.",
        fileLinks: "",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "seed-side-1",
        title: "Late Night Freestyle",
        stage: "Demo",
        itemType: "Side Release",
        priority: "Medium",
        tags: ["freestyle1"],
        releaseDate: inDays(9),
        vibe: "",
        theme: "",
        genre: "",
        bpm: "",
        key: "",
        collaborators: "",
        producer: "",
        nextAction: "One-take video at the studio",
        releasePotential: "Medium",
        notes: "",
        fileLinks: "",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "seed-brand-1",
        title: "Gym + studio photodump",
        stage: "Idea",
        itemType: "Brand Release",
        priority: "Low",
        tags: ["photodump"],
        releaseDate: inDays(4),
        vibe: "",
        theme: "",
        genre: "",
        bpm: "",
        key: "",
        collaborators: "",
        producer: "",
        nextAction: "Pick 10 photos",
        releasePotential: "Medium",
        notes: "",
        fileLinks: "",
        createdAt: now,
        updatedAt: now,
      },
    ],
    releases: [],
    content: [],
    assets: [],
    vault: [],
    brand: [],
    weeklyReviews: [],
    tasks: [],
    notToday: [],
    todayPriority: "",
    priorityItems: [],
    budgetItems: [
      {
        id: "seed-budget-1",
        label: "Mix + master",
        amount: 300,
        type: "expense",
        category: "Studio",
        linkedSongId: null,
        tags: ["june26"],
        date: inDays(-6),
        notes: "",
        createdAt: now,
      },
    ],
    settings: defaultSettings(),
  };
}
