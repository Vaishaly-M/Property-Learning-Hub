import Link from "next/link";
import {
  CalendarDays,
  CheckCircle,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

const whyBook = [
  {
    icon: Target,
    title: "Get Clarity",
    text: "Understand your goals and the next steps",
  },
  {
    icon: Users,
    title: "Personalised Advice",
    text: "Speak directly with Andrei no generic responses",
  },
  {
    icon: CheckCircle,
    title: "No Obligation",
    text: "Free 30-minute consultation with zero pressure",
  },
];

export default function StrategyCTA() {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-100/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-4xl">
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 text-blue-700 rounded-full px-4 py-1.5 mb-5">
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider">
              Book Your Discovery Call
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-slate-900 leading-tight tracking-tight">
            Ready to Transform Your Future?{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500">
              Let&apos;s Talk
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Book a free discovery call with Andrei. Choose a time, get a Teams
            or Zoom invite by email, and take the next step in your property
            journey.
          </p>
        </div>

        <div className="rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/10 border border-slate-200/80 bg-white p-8 sm:p-10 text-center">
          <ul className="grid sm:grid-cols-3 gap-6 mb-10 text-left">
            {whyBook.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-700" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/discovery-call"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl shadow-lg shadow-blue-900/25 hover:from-blue-800 hover:to-blue-600 hover:scale-[1.02] transition-all"
          >
            <CalendarDays className="w-5 h-5" />
            Book Your Discovery Call
          </Link>

          <p className="mt-4 text-sm text-slate-500">
            Free 30-minute call · Teams or Zoom · No obligation
          </p>
        </div>
      </div>
    </section>
  );
}
