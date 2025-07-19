"use client"

import type { CalEvent } from "@/app/context/wendy-context"
import { useWendyState } from "@/app/context/wendy-context"
import { Calendar, Clock, MapPin, Phone, StickyNote, Sparkles } from "lucide-react"

interface FullCalendarProps {
  events: CalEvent[]
}

export function FullCalendar({ events }: FullCalendarProps) {
  const { state } = useWendyState()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getEventTypeColor = (type: CalEvent["type"]) => {
    switch (type) {
      case "appointment":
        return "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50 text-blue-800"
      case "meeting":
        return "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200/50 text-green-800"
      case "deadline":
        return "bg-gradient-to-r from-red-50 to-rose-50 border-red-200/50 text-red-800"
      case "event":
        return "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200/50 text-purple-800"
      default:
        return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200/50 text-gray-800"
    }
  }

  const getEventTypeEmoji = (type: CalEvent["type"]) => {
    switch (type) {
      case "appointment":
        return "📅"
      case "meeting":
        return "🤝"
      case "deadline":
        return "⏰"
      case "event":
        return "🎉"
      default:
        return "📋"
    }
  }

  const getVendorName = (vendorId?: string) => {
    if (!vendorId) return null
    const vendor = state.vendors.find((v) => v.id === vendorId)
    return vendor?.name
  }

  const groupEventsByDate = (events: CalEvent[]) => {
    const grouped: { [key: string]: CalEvent[] } = {}
    events.forEach((event) => {
      const date = new Date(event.start).toDateString()
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(event)
    })
    return grouped
  }

  const groupedEvents = groupEventsByDate(events)

  return (
    <div className="wedding-card rounded-3xl shadow-xl shadow-rose-200/30 border border-rose-200/50 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-rose-50 p-6 border-b border-rose-200/30">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-400 shadow-lg">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold luxury-serif text-rose-800">Wedding Timeline</h2>
            <p className="text-rose-600/70 luxury-serif italic">Your journey to the perfect day</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-amber-700 font-medium">{events.length} events scheduled</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {Object.entries(groupedEvents).map(([date, dayEvents]) => (
          <div key={date} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center border-2 border-rose-200/50">
                <span className="text-lg font-bold text-rose-600">{new Date(dayEvents[0].start).getDate()}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold luxury-serif text-rose-800">{formatDate(dayEvents[0].start)}</h3>
                <p className="text-sm text-rose-600/70">
                  {dayEvents.length} event{dayEvents.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="ml-16 space-y-4">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-6 rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${getEventTypeColor(
                    event.type,
                  )}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getEventTypeEmoji(event.type)}</span>
                        <h4 className="text-xl font-bold luxury-serif">{event.name}</h4>
                        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/50 border border-current/20">
                          {event.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span className="font-semibold">
                          {formatTime(event.start)} - {formatTime(event.end)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getVendorName(event.vendorId) && (
                      <div className="flex items-center gap-3 p-3 bg-white/30 rounded-xl border border-current/10">
                        <MapPin className="h-4 w-4" />
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide opacity-70">With Vendor</p>
                          <p className="font-semibold">{getVendorName(event.vendorId)}</p>
                        </div>
                      </div>
                    )}

                    {event.contact && (
                      <div className="flex items-center gap-3 p-3 bg-white/30 rounded-xl border border-current/10">
                        <Phone className="h-4 w-4" />
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Contact</p>
                          <p className="font-semibold">{event.contact}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {event.notes && (
                    <div className="mt-4 flex items-start gap-3 p-3 bg-white/30 rounded-xl border border-current/10">
                      <StickyNote className="h-4 w-4 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">Notes</p>
                        <p className="text-sm leading-relaxed">{event.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
