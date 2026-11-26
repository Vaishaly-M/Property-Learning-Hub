import AboutHero from "@/components/About/AboutHero";
import Biography from "@/components/About/Biography";
import UKConstruction from "@/components/About/UKConstruction";
import FirstPropertyProjects from "@/components/About/FirstPropertyProjects";
import InternationalExpansionDubai from "@/components/About/InternationalExpansionDubai";
import TransitionToSA from "@/components/About/TransitionToSA";
import BusinessAutopilot from "@/components/About/BusinessAutopilot";
import MentorshipGivingBack from "@/components/About/MentorshipGivingBack";

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-20">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AboutHero />

        <div className="max-w-7xl mx-auto space-y-8">
          <Biography />
          <UKConstruction />
          <FirstPropertyProjects />
          <TransitionToSA />
          <InternationalExpansionDubai />
          <BusinessAutopilot />
          <MentorshipGivingBack />
        </div>
      </div>
    </main>
  );
}
