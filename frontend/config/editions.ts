// One codebase, two editions. NEXT_PUBLIC_EDITION picks which one a deployment is (Vercel project env var).
// Lite: low data, simple, built first. Main: the full product (player card, comparisons, coach rooms...).

export type Edition = "lite" | "main";

export interface Plan {
  id: string;
  name: string;
  price: string; // display only: payments are test mode
  period: string;
  blurb: string;
  features: string[];
  highlight?: boolean;
}

export interface EditionConfig {
  id: Edition;
  name: string;
  tagline: string;
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

export const EDITIONS: Record<Edition, EditionConfig> = {
  lite: {
    id: "lite",
    name: "PitchIQ Lite",
    tagline: "Built for slow, expensive data: small uploads, fast pages.",
    modules: { playerCard: "simple", comparison: false, trainingPlans: false, coachRooms: false, charts: false },
    plans: LITE_PLANS,
  },
  main: {
    id: "main",
    name: "PitchIQ",
    tagline: "The full training platform for players and coaches.",
    modules: { playerCard: "full", comparison: true, trainingPlans: true, coachRooms: true, charts: true },
    plans: LITE_PLANS, // Main plans (Coach, Federation) come with the Main edition build
  },
};

export const EDITION: EditionConfig = EDITIONS[(process.env.NEXT_PUBLIC_EDITION as Edition) || "lite"] ?? EDITIONS.lite;
