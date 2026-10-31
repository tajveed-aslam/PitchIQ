// Types for the Main (Global) edition endpoints (backend/app/routers/player.py, insights.py, rooms.py).
import type { AnalysisSummary, Analysis } from "./api";

export interface Rating {
  key: string;
  label: string;
  value: number | null;
  measured_by?: "video" | null;
}

export interface FullCard {
  name: string;
  overall: number | null;
  skills: Rating[];
  activity: number | null;
  sessions: number;
  best?: number;
  mindset: { traits: Rating[]; score: number | null; taken_at: string | null };
  reaction: { rating: number; median_ms: number; best_ms: number; times_ms: number[]; false_starts: number; taken_at: string } | null;
  logic: { rating: number; correct: number; total: number; seconds: number; taken_at: string } | null;
  physical: {
    height_cm: number | null;
    weight_kg: number | null;
    age: number | null;
    body_type: string | null;
    preferred_foot: string | null;
    position: string | null;
    shirt_number: number | null;
  };
  complete: number;
  sections: Record<"skills" | "physical" | "mindset" | "reaction" | "logic", boolean>;
  readiness: { value: number; parts: { label: string; value: number | null }[] } | null;
}

export interface BadgeInfo {
  code: string;
  name: string;
  text: string;
  icon: string;
  earned_at: string | null;
}

export interface OpenTask {
  id: number;
  room_id: number;
  room: string;
  title: string;
  due_at: string;
  overdue: boolean;
  due_soon: boolean;
  target_touches: number | null;
}

export interface Overview {
  card: FullCard;
  badges: { earned: number; total: number; latest: BadgeInfo[] };
  training: { id: number; goal_touches: number; done: number; total: number; created_at: string } | null;
  tasks: OpenTask[];
  week: { sessions: number };
}

export interface Physical {
  height_cm: number | null;
  weight_kg: number | null;
  birth_year: number | null;
  body_type: string | null;
  shirt_number: number | null;
  prefs: { tasks: boolean; reports: boolean; badges: boolean };
}

export interface PlanSession {
  name: string;
  minutes: number;
  note: string;
  how: string;
  reps: string;
}

export interface PlanDay {
  day: number;
  title: string;
  rest: boolean;
  sessions: PlanSession[];
}

export interface TrainingWeek {
  id: number;
  summary: string;
  focus: string[];
  goal_touches: number;
  days: PlanDay[];
  source: "ai" | "rules";
  note?: string;
  week_of: string;
  done: string[];
  created_at: string;
  new_badges?: string[];
}

export interface ProgressPoint {
  id: number;
  date: string;
  title: string;
  touches: number;
  range: [number, number];
  certain: number;
  per_minute: number | null;
  interval: number | null;
  rhythm_cv: number | null;
  arc: number | null;
  rhythm: string;
  control: string;
  duration: number;
}

export interface Progress {
  locked: boolean;
  points: ProgressPoint[];
  personal_bests: { id: number; date: string; touches: number }[];
  summary: { sessions: number; best: number | null; first_avg: number | null; recent_avg: number | null; change: number | null; recent_rhythm: string | null };
  trend: { per_week: number; intercept: number; slope_per_day: number; start: string; sessions: number;
    line: { day: number; touches: number }[]; ahead: { day: number; touches: number }[] } | null;
  weeks: { week: string; sessions: number }[];
  assessments: { kind: string; score: number; date: string }[];
}

export type CompareSide = AnalysisSummary & ProgressPoint & { touch_times: number[]; intervals: number[] };

export interface Comparison {
  a: CompareSide;
  b: CompareSide;
  changes: { key: "touches" | "per_minute" | "rhythm_cv" | "arc" | "certain"; delta: number | null; better: "up" | "down" }[];
  verdict: "improved" | "dropped" | "level";
}

export interface RoomBrief {
  id: number;
  name: string;
  kind: "team" | "academy";
  description: string | null;
  role: "coach" | "player";
  players: number;
  tasks: number;
  coach: string;
  open_tasks?: number;
}

export interface Submission {
  id: number;
  user_id: number;
  name: string;
  analysis: AnalysisSummary | null;
  score: number | null;
  note: string | null;
  created_at: string;
  reviewed: boolean;
  met_target: boolean;
}

export interface RoomTask {
  id: number;
  title: string;
  notes: string | null;
  skill: string;
  target_touches: number | null;
  due_at: string;
  overdue: boolean;
  assignee: { id: number; name: string } | null;
  expected: number;
  submissions: Submission[];
}

export interface LeaderRow {
  rank: number;
  user_id: number;
  name: string;
  touches: number;
}

export interface Member {
  user_id: number;
  name: string;
  position: string | null;
  country: string | null;
  joined_at: string;
  best: number | null;
  last: number | null;
  first: number | null;
  sessions_30d: number;
  last_active: string | null;
  tasks_done: number;
  tasks_total: number;
  meets_criteria: boolean | null;
  scouting_note: string | null;
}

export interface RoomView {
  id: number;
  name: string;
  kind: "team" | "academy";
  description: string | null;
  criteria: { min_touches?: number } | null;
  coach: string;
  role: "coach" | "player";
  leaderboard: { week: LeaderRow[]; month: LeaderRow[] };
  milestones: { label: string; value: number; target: number }[];
  tasks: RoomTask[];
  // player view
  players?: string[];
  // coach view
  join_code?: string;
  code_expires_at?: string;
  code_expired?: boolean;
  members?: Member[];
  team?: {
    players: number;
    average_best: number | null;
    completion: number | null;
    weekly: { week: string; average: number | null; players: number }[];
    top: { name: string; best: number }[];
  };
  alerts?: { level: "warn" | "good"; text: string }[];
}

export interface PlayerInRoom {
  card: FullCard;
  reports: AnalysisSummary[];
  scouting_note: string | null;
  tasks: RoomTask[];
}

export type { Analysis };

export const TEST_LABEL: Record<string, string> = { mindset: "Mindset", reaction: "Reaction", logic: "Logic" };

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function dueLabel(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const hours = Math.round(ms / 3_600_000);
  if (ms < 0) return `${Math.abs(Math.round(hours / 24)) || "<1"} d overdue`;
  if (hours < 48) return `due in ${hours} h`;
  return `due in ${Math.round(hours / 24)} days`;
}
