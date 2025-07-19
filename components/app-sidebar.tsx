"use client"

import { Calendar, MessageCircle, Settings, Users, MapPin, Sparkles } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const items = [
  {
    title: "Chat with Wendy",
    url: "/chat",
    icon: MessageCircle,
    description: "AI assistance",
  },
  {
    title: "Vendors & Venues",
    url: "/vendors",
    icon: MapPin,
    description: "Your dream team",
  },
  {
    title: "Guest List",
    url: "/guests",
    icon: Users,
    description: "Loved ones",
  },
  {
    title: "Timeline",
    url: "/calendar",
    icon: Calendar,
    description: "Perfect planning",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    description: "Preferences",
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <div className="h-full flex flex-col">
      {/* Elegant Header */}
      <div className="p-8 border-b border-rose-200/30">
        <div className="flex items-center gap-3 mb-2">
          <div>
            <h1 className="text-7xl font-bold elegant-script bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              Wendy
            </h1>
            <p className="text-lg text-rose-600/70 luxury-serif italic">Your AI Wedding Planner</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 p-3 bg-gradient-to-r from-amber-50 to-rose-50 rounded-xl border border-amber-200/50">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <span className="text-xs text-amber-800 font-medium">Making your dreams come true</span>
        </div>
      </div>

      {/* Elegant Navigation */}
      <nav className="flex-1 p-6">
        <ul className="space-y-3">
          {items.map((item) => {
            const isActive = pathname === item.url
            return (
              <li key={item.title}>
                <Link
                  href={item.url}
                  className={`group flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-amber-100 via-rose-100 to-pink-100 text-rose-800 shadow-lg shadow-rose-100/50 border border-rose-200/50"
                      : "text-rose-700/70 hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 hover:text-rose-800 hover:shadow-md"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-br from-amber-400 to-rose-400 text-white shadow-lg"
                        : "bg-rose-100/50 text-rose-600 group-hover:bg-rose-200/70"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold luxury-serif">{item.title}</div>
                    <div className="text-xs opacity-70">{item.description}</div>
                  </div>
                  {isActive && <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-rose-400"></div>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Elegant Footer */}
      <div className="p-6 border-t border-rose-200/30">
        <div className="text-center">
          <div className="text-2xl mb-2">✨</div>
          <p className="text-xs text-rose-600/60 luxury-serif italic">"Love is in the details"</p>
        </div>
      </div>
    </div>
  )
}
