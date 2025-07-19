"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Heart, Mail, Phone, StickyNote } from "lucide-react"

// Type for database guest (matches Prisma schema)
type DatabaseGuest = {
  id: number
  name: string
  email: string
  rsvp: string
  createdAt: string
}

interface GuestTableProps {
  guests: DatabaseGuest[]
  onGuestUpdate?: () => void // Callback to refresh the guest list
}

export function GuestTable({ guests, onGuestUpdate }: GuestTableProps) {
  const handleRsvpChange = async (guest: DatabaseGuest, newRsvp: string) => {
    try {
      // TODO: Add API endpoint to update guest RSVP
      // For now, just log the change
      console.log(`Updating RSVP for ${guest.email} to ${newRsvp}`)
      
      // Call the callback to refresh the guest list
      if (onGuestUpdate) {
        onGuestUpdate()
      }
    } catch (error) {
      console.error('Error updating RSVP:', error)
    }
  }

  const getRsvpColor = (rsvp: string) => {
    switch (rsvp) {
      case "yes":
        return "text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200"
      case "no":
        return "text-red-700 bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
      case "maybe":
        return "text-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
      default:
        return "text-gray-700 bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
    }
  }

  const getRsvpEmoji = (rsvp: string) => {
    switch (rsvp) {
      case "yes":
        return "💚"
      case "no":
        return "💔"
      case "maybe":
        return "💛"
      default:
        return "❓"
    }
  }

  return (
    <div className="wedding-card rounded-3xl shadow-xl shadow-rose-200/30 border border-rose-200/50 overflow-hidden">
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-6 border-b border-rose-200/30">
        <div className="flex items-center gap-3">
          <Heart className="h-6 w-6 text-rose-600" />
          <h2 className="text-xl font-bold serif text-rose-800">Guest Registry</h2>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-rose-200/30 bg-gradient-to-r from-rose-50/30 to-pink-50/30">
            <TableHead className="font-bold serif text-rose-800">Name</TableHead>
            <TableHead className="font-bold serif text-rose-800">Contact</TableHead>
            <TableHead className="font-bold serif text-rose-800">RSVP Status</TableHead>
            <TableHead className="font-bold serif text-rose-800">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guests.map((guest, index) => (
            <TableRow
              key={guest.id}
              className={`border-rose-200/20 hover:bg-gradient-to-r hover:from-rose-50/30 hover:to-pink-50/30 transition-all duration-300 ${
                index % 2 === 0 ? "bg-white/50" : "bg-rose-50/20"
              }`}
            >
              <TableCell className="font-semibold text-rose-800 serif">{guest.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {guest.email?.includes("@") ? (
                    <Mail className="h-4 w-4 text-rose-500" />
                  ) : (
                    <Phone className="h-4 w-4 text-rose-500" />
                  )}
                  <span className="text-rose-700">{guest.email || "No contact"}</span>
                </div>
              </TableCell>
              <TableCell>
                <Select value={guest.rsvp} onValueChange={(value: string) => handleRsvpChange(guest, value)}>
                  <SelectTrigger className={`w-40 rounded-xl border ${getRsvpColor(guest.rsvp)} font-semibold`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="yes">💚 Yes</SelectItem>
                    <SelectItem value="no">💔 No</SelectItem>
                    <SelectItem value="maybe">💛 Maybe</SelectItem>
                    <SelectItem value="unknown">❓ Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex items-start gap-2">
                  <span className="text-rose-700 text-sm">Added via AI invite</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
