export type Priority = "High" | "Medium" | "Low";

export type SongStage =
  | "Idea"
  | "Lyrics / Concept"
  | "Demo"
  | "Production"
  | "Recording"
  | "Editing"
  | "Mixing"
  | "Mastering"
  | "Ready for Release"
  | "Released"
  | "Archived";

export const SONG_STAGES: SongStage[] = [
  "Idea",
  "Lyrics / Concept",
  "Demo",
  "Production",
  "Recording",
  "Editing",
  "Mixing",
  "Mastering",
  "Ready for Release",
  "Released",
  "Archived",
];

export interface Song {
  id: string;
  title: string;
  stage: SongStage;
  priority: Priority;
  vibe: string;
  theme: string;
  genre: string;
  bpm: string;
  key: string;
  collaborators: string;
  producer: string;
  nextAction: string;
  releasePotential: Priority;
  notes: string;
  fileLinks: string;
  createdAt: string;
  updatedAt: string;
}

export type ReleasePhase =
  | "Planning"
  | "Pre-release"
  | "Release Week"
  | "Released"
  | "Post-release"
  | "Archived";

export const RELEASE_PHASES: ReleasePhase[] = [
  "Planning",
  "Pre-release",
  "Release Week",
  "Released",
  "Post-release",
  "Archived",
];

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  // Optional counter items (e.g. "28 reel style hook videos" → count/target)
  count?: number;
  target?: number;
}

export interface Release {
  id: string;
  title: string;
  linkedSongId: string | null;
  releaseDate: string;
  phase: ReleasePhase;
  progress: number;
  notes: string;
  preReleaseChecklist: ChecklistItem[];
  releaseDayChecklist: ChecklistItem[];
  postReleaseChecklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export type ContentPlatform = "TikTok" | "Instagram" | "YouTube Shorts" | "Other";

export const CONTENT_PLATFORMS: ContentPlatform[] = [
  "TikTok",
  "Instagram",
  "YouTube Shorts",
  "Other",
];

export type ContentFormat =
  | "performance/lip sync"
  | "behind the song"
  | "lyric meaning"
  | "studio clip"
  | "lifestyle/vibe"
  | "funny/relatable"
  | "heartbreak story"
  | "transformation story"
  | "piano version"
  | "DJ/house version"
  | "direct-to-camera"
  | "visualizer clip"
  | "other";

export const CONTENT_FORMATS: ContentFormat[] = [
  "performance/lip sync",
  "behind the song",
  "lyric meaning",
  "studio clip",
  "lifestyle/vibe",
  "funny/relatable",
  "heartbreak story",
  "transformation story",
  "piano version",
  "DJ/house version",
  "direct-to-camera",
  "visualizer clip",
  "other",
];

export type ContentStatus =
  | "Idea"
  | "Scripted"
  | "Filmed"
  | "Edited"
  | "Scheduled"
  | "Posted"
  | "Reviewed";

export const CONTENT_STATUSES: ContentStatus[] = [
  "Idea",
  "Scripted",
  "Filmed",
  "Edited",
  "Scheduled",
  "Posted",
  "Reviewed",
];

export interface ContentItem {
  id: string;
  title: string;
  platform: ContentPlatform;
  linkedSongId: string | null;
  format: ContentFormat;
  status: ContentStatus;
  caption: string;
  filmingNotes: string;
  postDate: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  learning: string;
  createdAt: string;
  updatedAt: string;
}

export type AssetType =
  | "Demo"
  | "Master"
  | "Stem"
  | "Project File"
  | "Cover Art"
  | "Photo"
  | "Video"
  | "Reel/TikTok Clip"
  | "Lyric Sheet"
  | "Caption/Script"
  | "Press Asset"
  | "Brand Asset"
  | "Other";

export const ASSET_TYPES: AssetType[] = [
  "Demo",
  "Master",
  "Stem",
  "Project File",
  "Cover Art",
  "Photo",
  "Video",
  "Reel/TikTok Clip",
  "Lyric Sheet",
  "Caption/Script",
  "Press Asset",
  "Brand Asset",
  "Other",
];

export type AssetStatus = "Draft" | "Final" | "Needs Review" | "Archived";

export const ASSET_STATUSES: AssetStatus[] = ["Draft", "Final", "Needs Review", "Archived"];

export interface Asset {
  id: string;
  title: string;
  type: AssetType;
  linkedSongId: string | null;
  linkedReleaseId: string | null;
  linkedContentId: string | null;
  driveUrl: string;
  folderUrl: string;
  driveFileId: string;
  driveFolderId: string;
  mimeType: string;
  fileName: string;
  fileSize: number | null;
  thumbnailUrl: string;
  status: AssetStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type VaultCategory =
  | "Lyric idea"
  | "Song title"
  | "Melody idea"
  | "Content idea"
  | "Visual idea"
  | "Rollout idea"
  | "Collab idea"
  | "Branding idea"
  | "Marketing idea"
  | "Random note";

export const VAULT_CATEGORIES: VaultCategory[] = [
  "Lyric idea",
  "Song title",
  "Melody idea",
  "Content idea",
  "Visual idea",
  "Rollout idea",
  "Collab idea",
  "Branding idea",
  "Marketing idea",
  "Random note",
];

export type VaultStatus = "Raw" | "Useful" | "Promoted" | "Archived";

export const VAULT_STATUSES: VaultStatus[] = ["Raw", "Useful", "Promoted", "Archived"];

export interface VaultItem {
  id: string;
  category: VaultCategory;
  text: string;
  mood: string;
  linkedSongId: string | null;
  priority: Priority;
  status: VaultStatus;
  createdAt: string;
  updatedAt: string;
}

export type BrandSection = "Identity" | "Sound Direction" | "Visual Direction" | "Copy Bank";

export interface BrandNote {
  id: string;
  section: BrandSection;
  title: string;
  content: string;
  updatedAt: string;
}

export interface WeeklyReview {
  id: string;
  weekStartDate: string;
  creationNotes: string;
  contentNotes: string;
  releaseNotes: string;
  growthNotes: string;
  emotionalRealityNotes: string;
  nextWeekReleasePriority: string;
  nextWeekContentPriority: string;
  nextWeekCreationPriority: string;
  nextWeekBrandSkillPriority: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskArea = "Release" | "Content" | "Creative" | "Brand" | "Assets" | "Other";

export type TaskStatus = "Todo" | "In Progress" | "Done" | "Parked";

export const TASK_STATUSES: TaskStatus[] = ["Todo", "In Progress", "Done", "Parked"];

export interface Task {
  id: string;
  title: string;
  area: TaskArea;
  linkedSongId: string | null;
  linkedReleaseId: string | null;
  linkedContentId: string | null;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotTodayItem {
  id: string;
  text: string;
}

export interface PriorityItem {
  id: string;
  text: string;
  done: boolean;
}

export type BudgetCategory =
  | "Income"
  | "Studio"
  | "Marketing"
  | "Equipment"
  | "Samples / Plugins"
  | "Distribution"
  | "Visuals / Photos"
  | "Merch"
  | "Other";

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  "Income",
  "Studio",
  "Marketing",
  "Equipment",
  "Samples / Plugins",
  "Distribution",
  "Visuals / Photos",
  "Merch",
  "Other",
];

export interface BudgetItem {
  id: string;
  label: string;
  amount: number;
  type: "income" | "expense";
  category: BudgetCategory;
  linkedSongId: string | null;
  date: string;
  notes: string;
  createdAt: string;
}

export interface OSState {
  songs: Song[];
  releases: Release[];
  content: ContentItem[];
  assets: Asset[];
  vault: VaultItem[];
  brand: BrandNote[];
  weeklyReviews: WeeklyReview[];
  tasks: Task[];
  notToday: NotTodayItem[];
  todayPriority: string;
  priorityItems: PriorityItem[];
  budgetItems: BudgetItem[];
}
