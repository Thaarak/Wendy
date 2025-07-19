import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ActionLog } from "@/components/action-log"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen wedding-pattern">
      {/* Elegant Sidebar */}
      <div className="w-80 bg-gradient-to-b from-white via-rose-50/50 to-pink-50/50 border-r border-rose-200/30 shadow-xl shadow-rose-100/20 flex-shrink-0 backdrop-blur-sm">
        <AppSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>

      {/* Action Log */}
      <ActionLog />
    </div>
  )
}
