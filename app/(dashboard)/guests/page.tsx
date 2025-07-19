"use client"

import { useState, useEffect } from "react"
import { GuestTable } from "@/components/guest-table"
import { CreateGuestDialog } from "@/components/create-guest-dialog"
import { Users } from "lucide-react"

// Type for database guest (matches Prisma schema)
type DatabaseGuest = {
  id: number
  name: string
  email: string
  rsvp: string
  createdAt: string
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<DatabaseGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGuests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/guests')
      if (!response.ok) {
        throw new Error('Failed to fetch guests')
      }
      const data = await response.json()
      setGuests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch guests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuests()
  }, [])

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-12">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-400 shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold serif bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
                  Guest List
                </h1>
                <p className="text-rose-600/70 mt-2 text-lg serif italic">Your beloved family and friends</p>
              </div>
            </div>
          </div>
          <div className="ml-8">
            <CreateGuestDialog />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="wedding-card rounded-3xl p-12 max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
              <Users className="h-10 w-10 text-rose-400 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-rose-800 mb-3 serif">Loading guests...</h3>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <div className="wedding-card rounded-3xl p-12 max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
              <Users className="h-10 w-10 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-red-800 mb-3 serif">Error loading guests</h3>
            <p className="text-red-600/70 mb-8 serif">{error}</p>
            <button 
              onClick={fetchGuests}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : guests.length === 0 ? (
        <div className="text-center py-20">
          <div className="wedding-card rounded-3xl p-12 max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
              <Users className="h-10 w-10 text-rose-400" />
            </div>
            <h3 className="text-2xl font-bold text-rose-800 mb-3 serif">No guests yet</h3>
            <p className="text-rose-600/70 mb-8 serif">Start building your guest list with the people you love most</p>
            <CreateGuestDialog />
          </div>
        </div>
      ) : (
        <GuestTable guests={guests} onGuestUpdate={fetchGuests} />
      )}
    </div>
  )
}
