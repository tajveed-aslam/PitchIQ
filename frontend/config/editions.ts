// One codebase, two editions, chosen per visitor by the region switch in the header (cookie `pitchiq_region`):
// Africa -> Lite (default: low data, simple), Global -> Main (the full platform). middleware.ts serves the chosen
// edition at the same URLs; later it can default from the visitor's country instead.

export type Edition = "lite" | "main";
export type Region = "africa" | "global";

export const REGION_COOKIE = "pitchiq_region";
export const EDITION_OF: Record<Region, Edition> = { africa: "lite", global: "main" };

export interface Plan {
  id: string;
  name: string;
  price: string; // display only: payments are test mode
  period: string;
  blurb: string;
  features: string[];
  highlight?: boolean;
  comingSoon?: boolean; // shown but not selectable yet (built with the Main edition)
}

export interface EditionConfig {
  id: Edition;
  region: Region;
  regionLabel: string;
  name: string;
  badge: string | null;
  tagline: string;
  hero: { title: string; accent: string; body: string };
  modules: {
    playerCard: "simple" | "full";
    comparison: boolean;
    trainingPlans: boolean;
    coachRooms: boolean;
    charts: boolean;
  };
  plans: Plan[];
}

const LITE_PLANS: Plan[] = [
  {
    id: "trial",
    name: "Free trial",
    price: "$0",
    period: "7 days",
    blurb: "Try it with your own videos.",
    features: ["3 skill analyses", "Touch count with accuracy range", "Filming quality check"],
  },
  {
    id: "skill",
    name: "Skill Analysis",
    price: "$2",
    period: "per month",
    blurb: "For players training on their own.",
    features: ["20 analyses a month", "Progress over time", "Reports kept for 12 months", "Data-saver uploads"],
    highlight: true,
  },
  {
    id: "coach",
    name: "AI Coach",
    price: "$4",
    period: "per month",
    blurb: "Feedback and drills written for you.",
    features: ["Everything in Skill Analysis", "AI coaching on every report", "Drills picked for you", "Coaching checked against your numbers"],
  },
  {
    id: "events",
    name: "Events",
    price: "$1",
    period: "per event",
    blurb: "Enter challenges and see where you rank.",
    features: ["Monthly juggling challenge", "Your rank on the leaderboard", "5 analyses a month"],
  },
];

// Global prices; Coach and Federation plans arrive with the Main edition's coach rooms.
const MAIN_PLANS: Plan[] = [
  { ...LITE_PLANS[0] },
  { ...LITE_PLANS[1], price: "$6" },
  { ...LITE_PLANS[2], price: "$12" },
  { ...LITE_PLANS[3], price: "$3" },
  {
    id: "coach-team",
    name: "Coach",
    price: "$29",
    period: "per month",
    blurb: "Run a squad: rooms, tasks and a team dashboard.",
    features: ["Group rooms with join codes", "Tasks with deadlines", "Feedback on players' videos", "Team leaderboard"],
    comingSoon: true,
  },
  {
    id: "federation",
    name: "Federation",
    price: "Custom",
    period: "per season",
    blurb: "For academies and associations.",
    features: ["Many coaches and teams", "Scouting overview", "Custom challenges"],
    comingSoon: true,
  },
];

export const EDITIONS: Record<Edition, EditionConfig> = {
  lite: {
    id: "lite",
    region: "africa",
    regionLabel: "Africa",
    name: "PitchIQ Lite",
    badge: "Lite",
    tagline: "Built for slow, expensive data: small uploads, fast pages.",
    hero: {
      title: "Your phone sees",
      accent: "every touch.",
      body: "Film a juggling session, upload it, and PitchIQ counts your touches, reads your rhythm and ball control, then tells you what to work on next. Small uploads, made for slow connections.",
    },
    modules: { playerCard: "simple", comparison: false, trainingPlans: false, coachRooms: false, charts: false },
    plans: LITE_PLANS,
  },
  main: {
    id: "main",
    region: "global",
    regionLabel: "Global",
    name: "PitchIQ",
    badge: null,
    tagline: "The training platform for players and coaches: measured skills, AI coaching, team tools.",
    hero: {
      title: "Train with numbers,",
      accent: "not guesses.",
      body: "Every touch counted by computer vision, your rhythm and control measured, and an AI coach that turns the numbers into drills. Player cards, progress and team tools for coaches.",
    },
    modules: { playerCard: "full", comparison: true, trainingPlans: true, coachRooms: true, charts: true },
    plans: MAIN_PLANS,
  },
};

export const EDITION_IDS: Edition[] = ["lite", "main"];

export function isEdition(x: string): x is Edition {
  return x === "lite" || x === "main";
}
