// Types for the analysis report (mirrors analysis/report.py, schema_version 1) and the sample library built by
// analysis/samples.py into data/samples.json.
import data from "@/data/samples.json";

export interface Spread {
  mean: number;
  cv: number | null;
}

export interface QualityIssue {
  code: "camera_moving" | "ball_not_found" | "ball_hard_to_see" | "too_far" | string;
  message: string;
}

export interface Report {
  schema_version: number;
  model_version: string;
  skill: "juggling";
  video: { duration_s: number; fps: number; width: number; height: number };
  quality: {
    verdict: "ok" | "warn" | "reject";
    issues: QualityIssue[];
    ball_seen_pct: number;
    camera_moving_pct: number;
    ball_size_pct: number;
  };
  metrics: {
    touches: number;
    touches_range: [number, number];
    touches_certain: number;
    touch_times_s: number[];
    touches_per_minute: number | null;
    interval_s: Spread | null;
    arc_height_balls: Spread | null;
  };
  notes: string[];
  timing: { analysis_s: number };
}

export interface Sample {
  id: string;
  title: string;
  blurb: string;
  level: string;
  video: string;
  poster: string;
  credit: string;
  ground_truth: { touches: number | null; touch_times_s: number[] | null; counted_by: string };
  report: Report;
}

export const SAMPLES = data as unknown as Sample[];

export function sampleById(id: string): Sample | undefined {
  return SAMPLES.find((s) => s.id === id);
}

/** Rhythm in words, from the spread of time between touches (cv: lower = more even). */
export function rhythmLabel(cv: number | null | undefined): string {
  if (cv == null) return "Not enough touches";
  if (cv < 0.25) return "Very even";
  if (cv < 0.45) return "Steady";
  if (cv < 0.65) return "Uneven";
  return "Erratic";
}

/** Ball control in words, from how high the ball goes between touches (in ball diameters). */
export function controlLabel(arc: number | null | undefined): string {
  if (arc == null) return "Not enough touches";
  if (arc < 1.5) return "Tight";
  if (arc < 2.5) return "Controlled";
  if (arc < 4) return "Loose";
  return "Wild";
}
