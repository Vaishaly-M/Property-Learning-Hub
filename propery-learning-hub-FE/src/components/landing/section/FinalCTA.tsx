// components/sections/FinalCTA.tsx
import Link from "next/link";
import { Phone, GraduationCap } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="py-24 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-blue-200 font-semibold text-sm uppercase tracking-wider">
          Start Today
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mt-2">
          Your Property Investment
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-blue-300">
            Journey Starts Today
          </span>
        </h2>
        <p className="text-blue-100 text-lg max-w-2xl mx-auto mt-4 opacity-90">
          Take control of your financial future and learn the strategies used by
          successful property investors across the UK.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Link
            href="#strategy"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Phone size={18} />
            Book FREE Strategy Call
          </Link>
          <Link
            href="#programs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-all"
          >
            <GraduationCap size={18} />
            Join Academy
          </Link>
        </div>
      </div>
    </section>
  );
}
