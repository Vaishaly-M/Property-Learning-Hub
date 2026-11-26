// components/sections/DashboardPreview.tsx
import {
  LayoutDashboard,
  Video,
  Calendar,
  MessageSquare,
  FileText,
  FileCheck,
  FolderOpen,
  Trophy,
  TrendingUp,
  Lock,
} from "lucide-react";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Courses", active: true },
  { icon: Video, label: "Webinars", active: false },
  { icon: Calendar, label: "Weekly Meetings", active: false },
  { icon: MessageSquare, label: "Community Chat", active: false },
  { icon: FileText, label: "Resources", active: false },
  { icon: FileCheck, label: "Contracts", active: false },
  { icon: FolderOpen, label: "Files", active: false },
  { icon: Trophy, label: "Certificates", active: false },
  { icon: TrendingUp, label: "Progress", active: false },
];

const modules = [
  {
    stage: "Stage 1 · Unlocked",
    title: "Property Investment Foundations",
    progress: 100,
    locked: false,
  },
  {
    stage: "Stage 2 · Unlocked",
    title: "Market Research & Deal Analysis",
    progress: 68,
    locked: false,
  },
  {
    stage: "Stage 3 · Unlocked",
    title: "Rent-To-Rent Strategies",
    progress: 24,
    locked: false,
  },
  {
    stage: "Stage 4",
    title: "Scaling Your Property Portfolio",
    progress: 0,
    locked: true,
  },
  {
    stage: "Stage 5",
    title: "Advanced Wealth Building",
    progress: 0,
    locked: true,
  },
];

export default function DashboardPreview() {
  return (
    <section className="py-20 bg-white" id="preview">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">
            Member Platform
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-blue-950 mt-2">
            Your Academy Dashboard
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mt-4">
            A premium SaaS-grade learning environment designed for serious
            property investors.
          </p>
        </div>

        <div className="mt-12 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          {/* Top Bar */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-500 ml-2">
              Freedom Property Academy – Member Portal
            </span>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-gray-50/50 border-r border-gray-200 p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-3">
                Navigation
              </p>
              <div className="space-y-1">
                {sidebarItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                      item.active
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
              <h3 className="text-lg font-bold text-blue-950 mb-6">
                Your Learning Journey
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((mod, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-xl p-4 transition-all ${
                      mod.locked
                        ? "border-gray-200 bg-gray-50/30 opacity-75"
                        : "border-gray-200 hover:border-blue-200"
                    }`}
                  >
                    <p className="text-xs font-semibold text-blue-600">
                      {mod.stage}
                    </p>
                    <p className="font-semibold text-gray-900 mt-1">
                      {mod.title}
                    </p>
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600`}
                        style={{ width: `${mod.progress}%` }}
                      />
                    </div>
                    {mod.locked ? (
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Lock size={12} /> Complete previous stage to unlock
                      </p>
                    ) : mod.progress === 100 ? (
                      <p className="text-xs text-green-600 font-medium mt-2">
                        ✓ Completed
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2">
                        {mod.progress}% complete
                      </p>
                    )}
                  </div>
                ))}
                <div className="border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-blue-50/20">
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="text-xs text-gray-500 font-medium">
                    Bonus content added weekly
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
