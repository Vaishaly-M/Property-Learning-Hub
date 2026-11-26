// app/members/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  ArrowRight,
  CheckCircle2,
  Users,
  TrendingUp,
  Award,
  Play,
  Star,
  MapPin,
  User,
  Building2,
  Target,
  Shield,
  Heart,
  Phone,
  Calendar,
  Home,
  PoundSterling,
  Percent,
  Clock,
  Sparkles,
  Zap,
  Gift,
  Rocket,
  Crown,
  Briefcase,
  GraduationCap,
  MessageCircle,
  Video,
  BookOpen,
  FileText,
  CalendarDays,
  Network,
  Trophy,
  Medal,
  ThumbsUp,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const memberBenefits = [
  {
    icon: GraduationCap,
    title: "Full Course Access",
    description: "Complete property investment training library",
  },
  {
    icon: Video,
    title: "Weekly Live Sessions",
    description: "Live mentorship and Q&A with experts",
  },
  {
    icon: MessageCircle,
    title: "Private Community",
    description: "Connect with like-minded investors",
  },
  {
    icon: FileText,
    title: "Templates & Contracts",
    description: "Ready-to-use legal documents and templates",
  },
  {
    icon: CalendarDays,
    title: "Strategy Sessions",
    description: "Personalized monthly strategy calls",
  },
  {
    icon: Network,
    title: "Networking Events",
    description: "Exclusive member meetups and events",
  },
];

const memberTestimonials = [
  {
    id: 1,
    name: "Sarah M.",
    location: "Birmingham",
    image: "/campaign/reviewers/Sarah.png",
    quote:
      "The FPA membership gave me the confidence to start my SA business. Within 6 weeks I secured my first deal and I'm now generating consistent monthly income.",
    achievement: "First Deal in 6 Weeks",
  },
  {
    id: 2,
    name: "Daniel R.",
    location: "Manchester",
    image: "/campaign/reviewers/Daniel.png",
    quote:
      "I was stuck for over a year before joining FPA. The practical strategies and hands-on support helped me secure three units in just four months.",
    achievement: "3 Units in 4 Months",
  },
  {
    id: 3,
    name: "Francesca P.",
    location: "London",
    image: "/campaign/reviewers/Francesca.png",
    quote:
      "As a full-time nurse, I didn't think I had time to start a property business. FPA's systems made it possible. I earn more from my unit now than from all my overtime hours combined.",
    achievement: "Income > Overtime",
  },
];

const memberStats = [
  { icon: Users, value: "500+", label: "Active Members" },
  { icon: Home, value: "1000+", label: "Properties Managed" },
  { icon: TrendingUp, value: "£50M+", label: "Combined Portfolio Value" },
  { icon: Award, value: "97%", label: "Member Satisfaction" },
];

const membershipTiers = [
  {
    name: "Starter",
    price: "£997",
    period: "one-time",
    description: "Perfect for beginners starting their property journey",
    features: [
      "Full Course Access",
      "Basic Templates",
      "Community Access (Read Only)",
      "Monthly Newsletter",
      "Resource Library",
    ],
    popular: false,
    buttonText: "Get Started",
    buttonColor: "border-blue-200 hover:border-blue-300",
  },
  {
    name: "Professional",
    price: "£2,997",
    period: "annual",
    description: "For serious investors ready to scale their portfolio",
    features: [
      "Everything in Starter",
      "Weekly Live Sessions",
      "Full Community Access",
      "Strategy Templates",
      "Contract Library",
      "Monthly Q&A",
      "Member Events",
      "Priority Support",
    ],
    popular: true,
    buttonText: "Join Now",
    buttonColor: "bg-gradient-to-r from-blue-600 to-blue-700",
  },
  {
    name: "Elite",
    price: "£5,997",
    period: "annual",
    description: "For established investors seeking maximum growth",
    features: [
      "Everything in Professional",
      "1-on-1 Mentorship",
      "Personalized Strategy",
      "Deal Analysis",
      "Joint Venture Access",
      "Exclusive Events",
      "VIP Support",
      "Business Development",
    ],
    popular: false,
    buttonText: "Apply Now",
    buttonColor: "border-blue-200 hover:border-blue-300",
  },
];

const memberJourney = [
  {
    step: "01",
    title: "Join the Community",
    desc: "Get instant access to our private member platform",
  },
  {
    step: "02",
    title: "Complete Training",
    desc: "Work through our comprehensive course modules",
  },
  {
    step: "03",
    title: "Attend Live Sessions",
    desc: "Join weekly mentorship and strategy calls",
  },
  {
    step: "04",
    title: "Take Action",
    desc: "Implement strategies and secure your first deal",
  },
  {
    step: "05",
    title: "Scale & Grow",
    desc: "Build your portfolio with ongoing support",
  },
];

export default function MembersPage() {
  const { ref: heroRef, inView: heroInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  const { ref: benefitsRef, inView: benefitsInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-950">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-3xl" />
        </div>

        <div
          className="container mx-auto px-4 sm:px-6 lg:px-8 relative"
          ref={heroRef}
        >
          <motion.div
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full mb-6"
            >
              <Crown size={16} />
              <span className="font-semibold text-sm">
                Exclusive Membership
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-blue-950 dark:text-white mb-6 leading-tight"
            >
              Join the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600">
                Freedom Property Academy
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8"
            >
              Unlock your potential with comprehensive training, live
              mentorship, and a community of like-minded property investors.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-wrap justify-center gap-4"
            >
              <Link
                href="#membership"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all text-lg"
              >
                View Membership Plans
                <ArrowRight size={20} />
              </Link>
              <Link
                href="#about"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-lg"
              >
                <Play size={20} />
                Watch Demo
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap justify-center gap-8"
            >
              {memberStats.map((stat, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <stat.icon
                      size={20}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold text-blue-950 dark:text-white">
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* WHY JOIN */}
      <section
        className="py-16 bg-white dark:bg-gray-950 border-y border-gray-100 dark:border-gray-800"
        ref={benefitsRef}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider">
              Member Benefits
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-950 dark:text-white mt-2">
              Everything You Need to Succeed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-4 text-lg">
              Get access to our complete property investment ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memberBenefits.map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={benefitsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                  <benefit.icon
                    size={24}
                    className="text-blue-600 dark:text-blue-400"
                  />
                </div>
                <h3 className="font-bold text-blue-950 dark:text-white mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MEMBER JOURNEY */}
      <section className="py-16 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider">
              Your Path
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-950 dark:text-white mt-2">
              Member Journey
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-4 text-lg">
              Five steps to property investment success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {memberJourney.map((step, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center"
              >
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-bold text-blue-950 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEMBERSHIP PLANS */}
      <section className="py-16 bg-white dark:bg-gray-950" id="membership">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider">
              Choose Your Plan
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-950 dark:text-white mt-2">
              Membership Plans
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-4 text-lg">
              Select the plan that best fits your goals and experience level
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {membershipTiers.map((tier, idx) => (
              <div
                key={idx}
                className={`bg-white dark:bg-gray-900 rounded-2xl p-8 border transition-all duration-300 ${
                  tier.popular
                    ? "border-blue-300 dark:border-blue-700 shadow-xl relative"
                    : "border-gray-200 dark:border-gray-800 shadow-md hover:shadow-xl hover:-translate-y-1"
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-blue-950 dark:text-white">
                    {tier.name}
                  </h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-blue-950 dark:text-white">
                      {tier.price}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                      /{tier.period}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {tier.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, fIdx) => (
                    <li
                      key={fIdx}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <CheckCircle2
                        size={16}
                        className="text-blue-600 dark:text-blue-400 flex-shrink-0"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    tier.popular
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  {tier.buttonText}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEMBER TESTIMONIALS */}
      <section className="py-16 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-full mb-6 shadow-xl">
                <Users size={24} />
                <span className="font-bold text-lg">
                  Member Success Stories
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-blue-950 dark:text-white mb-4">
                What Our Members Say
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Real stories from real members who transformed their financial
                future
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {memberTestimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {testimonial.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <MapPin size={14} />
                        <span>{testimonial.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className="fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm font-semibold mb-4">
                    <CheckCircle2 size={16} className="text-green-500" />
                    {testimonial.achievement}
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h3 className="text-4xl sm:text-5xl font-bold mb-4">
              Ready to Join the Academy?
            </h3>
            <p className="text-blue-100 text-xl mb-8 max-w-2xl mx-auto">
              Start your journey to financial freedom today with the Freedom
              Property Academy.
            </p>
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {[
                { label: "500+", desc: "Active Members" },
                { label: "97%", desc: "Satisfaction Rate" },
                { label: "24/7", desc: "Community Support" },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 min-w-[120px] border border-white/10"
                >
                  <div className="text-2xl font-bold">{stat.label}</div>
                  <div className="text-sm text-blue-200">{stat.desc}</div>
                </div>
              ))}
            </div>
            <Link
              href="#membership"
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-10 py-5 rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 text-lg"
            >
              View Membership Plans
              <ArrowRight size={20} />
            </Link>
            <p className="text-blue-200 text-sm mt-4">
              Cancel anytime • No commitment required
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
