// Small typed client for the PitchIQ API (backend/app). The login token lives in localStorage; requests send it
// as a bearer token. Errors carry the API's human-readable `detail` so pages can show it as is.
import type { Report } from "./samples";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010").replace(/\/$/, "");
const TOKEN_KEY = "pitchiq.token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: the session just won't persist */
  }
}

function detailOf(body: unknown, status: number): string {
  const d = (body as { detail?: unknown })?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg).replace(/^Value error, /, "");
  if (status === 0) return "Can't reach PitchIQ. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(API_URL + path, { ...init, headers, body });
  } catch {
    throw new ApiError(0, detailOf(null, 0));
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) setToken(null);
    throw new ApiError(res.status, detailOf(data, res.status));
  }
  return data as T;
}

/** Upload with progress (fetch can't report upload progress; XMLHttpRequest can). */
export function uploadVideo(file: Blob, filename: string, title: string, onProgress: (pct: number) => void): Promise<Analysis> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file, filename);
    form.append("title", title);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/analyses`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((100 * e.loaded) / e.total));
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as Analysis);
      else reject(new ApiError(xhr.status, detailOf(data, xhr.status)));
    };
    xhr.onerror = () => reject(new ApiError(0, detailOf(null, 0)));
    xhr.send(form);
  });
}

// ---- Types (mirror backend/app/schemas.py) ----

export interface User {
  id: number;
  email: string;
  name: string;
  is_guest: boolean;
  plan: PlanId;
  plan_started_at: string;
  created_at: string;
  age: number | null;
  position: string | null;
  favourite_team: string | null;
  country: string | null;
  preferred_foot: string | null;
}

export type PlanId = "trial" | "skill" | "coach" | "events";

export interface Allowance {
  plan: PlanId;
  plan_name: string;
  limit: number;
  used: number;
  remaining: number;
  period: "today" | "trial" | "month";
  trial_expired: boolean;
  features: { coaching: boolean; progress: boolean; events: boolean };
}

export interface Drill {
  name: string;
  how: string;
  reps: string;
  why?: string;
}

export interface Coaching {
  summary: string;
  strengths: string[];
  focus: string[];
  drills: Drill[];
  next_goal: string;
  source: "ai" | "rules";
  note?: string;
}

export interface AnalysisSummary {
  id: number;
  title: string;
  skill: string;
  source: "upload" | "sample" | "seed";
  sample_id: string | null;
  status: "queued" | "processing" | "done" | "rejected" | "failed";
  stage: string;
  touches: number | null;
  verdict: "ok" | "warn" | "reject" | null;
  created_at: string;
  has_thumbnail: boolean;
  thumbnail_url: string | null;
}

export interface Analysis extends AnalysisSummary {
  error: string | null;
  report: Report | null;
  coaching: Coaching | null;
  coaching_locked: boolean;
}

export interface Notification {
  id: number;
  text: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface CardAttribute {
  key: string;
  label: string;
  value: number | null;
}

export interface Dashboard {
  user: User;
  allowance: Allowance;
  card: { overall: number | null; attributes: CardAttribute[]; sessions: number; best?: number };
  stats: { analyses: number; best: number | null; last: number | null; change: number | null };
  recent: AnalysisSummary[];
  notifications: Notification[];
}

export function thumbUrl(a: { thumbnail_url: string | null }): string | null {
  return a.thumbnail_url ? API_URL + a.thumbnail_url : null;
}

export const STAGE_LABEL: Record<string, string> = {
  queued: "Waiting in line",
  waiting: "Waking up the analysis service",
  quality: "Checking video quality",
  tracking: "Tracking the ball",
  counting: "Counting touches",
  done: "Done",
};
