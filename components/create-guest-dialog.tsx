"use client"

import type React from "react"

import { useState } from "react"
import { useWendyState } from "@/app/context/wendy-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Sparkles, Users } from "lucide-react"

export function CreateGuestDialog() {
  const { dispatch } = useWendyState()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    notes: "",
    rsvp: "unknown" as "yes" | "no" | "maybe" | "unknown",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      alert("Please enter guest name")
      return
    }

    dispatch({
      type: "create_guest_from_json",
      payload: {
        name: formData.name,
        contact: formData.contact || undefined,
        notes: formData.notes || undefined,
        rsvp: formData.rsvp,
      },
    })

    // Reset form and close dialog
    setFormData({
      name: "",
      contact: "",
      notes: "",
      rsvp: "unknown",
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:from-amber-600 hover:via-rose-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 font-semibold luxury-serif">
          <Plus className="h-5 w-5 mr-2" />
          Add Guest
          <Sparkles className="h-4 w-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] wedding-card rounded-3xl border-rose-200/50">
        <DialogHeader className="text-center pb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center shadow-lg">
            <Users className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold luxury-serif bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            Add New Guest
          </DialogTitle>
          <p className="text-rose-600/70 luxury-serif italic">Welcome another loved one to your special day</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-rose-800 font-semibold luxury-serif">
              Guest Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter guest name"
              className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact" className="text-rose-800 font-semibold luxury-serif">
              Contact Information
            </Label>
            <Input
              id="contact"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="Email or phone number"
              className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rsvp" className="text-rose-800 font-semibold luxury-serif">
              RSVP Status
            </Label>
            <Select
              value={formData.rsvp}
              onValueChange={(value: "yes" | "no" | "maybe" | "unknown") => setFormData({ ...formData, rsvp: value })}
            >
              <SelectTrigger className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="unknown">❓ Unknown</SelectItem>
                <SelectItem value="yes">💚 Yes</SelectItem>
                <SelectItem value="no">💔 No</SelectItem>
                <SelectItem value="maybe">💛 Maybe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-rose-800 font-semibold luxury-serif">
              Notes & Preferences
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Dietary restrictions, preferences, special notes..."
              rows={4}
              className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl shadow-lg font-semibold luxury-serif"
            >
              Add Guest
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
