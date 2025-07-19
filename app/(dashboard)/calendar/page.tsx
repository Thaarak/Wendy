"use client"

import { useWendyState } from "@/app/context/wendy-context"
import { FullCalendar } from "@/components/full-calendar"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { Calendar } from "lucide-react"

export default function CalendarPage() {
  const { state } = useWendyState()

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-12">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-400 shadow-lg">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold luxury-serif bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
                  Wedding Calendar
                </h1>
                <p className="text-rose-600/70 mt-2 text-lg luxury-serif italic">Your timeline to the perfect day</p>
              </div>
            </div>
          </div>
          <div className="ml-8">
            <CreateEventDialog />
          </div>
        </div>
      </div>

      {state.events.length === 0 ? (
        <div className="text-center py-20">
          <div className="wedding-card rounded-3xl p-12 max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-100 to-rose-100 flex items-center justify-center">
              <Calendar className="h-10 w-10 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-rose-800 mb-3 luxury-serif">No events scheduled</h3>
            <p className="text-rose-600/70 mb-8 luxury-serif">
              Start planning your perfect timeline with appointments and milestones
            </p>
            <CreateEventDialog />
          </div>
        </div>
      ) : (
        <FullCalendar events={state.events} />
      )}
    </div>
  )
}
