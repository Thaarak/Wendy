"use client"

import { useWendyState } from "@/app/context/wendy-context"
import { GuestTable } from "@/components/guest-table"
import { CreateGuestDialog } from "@/components/create-guest-dialog"
import { Users } from "lucide-react"

export default function GuestsPage() {
  const { state } = useWendyState()

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

      {state.guests.length === 0 ? (
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
        <GuestTable guests={state.guests} />
      )}
    </div>
  )
}
