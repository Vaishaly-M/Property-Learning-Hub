// app/page.tsx
"use client";

import Hero from "../components/landing/section/hero";
import StrategyCTA from "../components/landing/section/StrategyCTA";
import BookingScreenshots from "@/components/landing/section/BookingScreenshots";
import Headline1 from "../components/landing/section/Headline1";
import VideoTestimonials from "@/components/landing/section/VideoTestimonials";
import Headline2 from "../components/landing/section/Headline2";
import AboutMentor from "@/components/landing/section/AboutMentor";
import Headline3 from "../components/landing/section/Headline3";
import Testimonials from "@/components/landing/section/Testimonials";
import Curriculum from "@/components/landing/section/Curriculum";

const PublicLandingPage = () => {
  return (
    <main className="flex flex-1 flex-col bg-white">
      <Hero />
      <BookingScreenshots />
      <Headline1 />
      <VideoTestimonials />
      <Headline2 />
      <AboutMentor />
      <Headline3 />
      <Testimonials />
      <Curriculum />
      <StrategyCTA />
      {/* <DashboardPreview /> */}
      {/* <Journey /> */}
      {/* <StrategyCTA /> */}
      {/* <FAQ /> */}
      {/* <Contact /> */}
      {/* <FinalCTA /> */}
    </main>
  );
};

export default function Home() {
  return <PublicLandingPage />;
}