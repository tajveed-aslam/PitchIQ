import { Hero } from "@/components/landing/Hero";
import {
  FilmingTips,
  FinalCta,
  HowItWorks,
  Plans,
  SamplesPreview,
  StatsStrip,
  Testimonials,
} from "@/components/landing/Sections";

export default function Home() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <SamplesPreview />
      <FilmingTips />
      <Plans edition="lite" />
      <Testimonials />
      <FinalCta />
    </>
  );
}
