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
import { Plus, Sparkles, Calendar } from "lucide-react"

export function CreateEventDialog() {
  const { dispatch, state } = useWendyState()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: "appointment" as "appointment" | "deadline" | "meeting" | "event",
    name: "",
    start: "",
    end: "",
    contact: "",
    notes: "",
    vendorId: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.type || !formData.name || !formData.start || !formData.end) {
      alert("Please fill in all required fields")
      return
    }

    // Validate that end time is after start time
    if (new Date(formData.end) <= new Date(formData.start)) {
      alert("End time must be after start time")
      return
    }

    dispatch({
      type: "create_event_from_json",
      payload: {
        type: formData.type as "appointment" | "deadline" | "meeting" | "event",
        name: formData.name,
        start: formData.start,
        end: formData.end,
        contact: formData.contact || undefined,
        notes: formData.notes || undefined,
        vendorId: formData.vendorId || undefined,
      },
    })

    // Reset form and close dialog
    setFormData({
      type: "appointment",
      name: "",
      start: "",
      end: "",
      contact: "",
      notes: "",
      vendorId: "",
    })
    setOpen(false)
  }

  // Format datetime-local input value
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Set default start time to next hour
  const getDefaultStartTime = () => {
    const now = new Date()
    now.setHours(now.getHours() + 1, 0, 0, 0)
    return formatDateTimeLocal(now)
  }

  // Set default end time to 1 hour after start
  const getDefaultEndTime = (startTime: string) => {
    if (!startTime) return ""
    const start = new Date(startTime)
    start.setHours(start.getHours() + 1)
    return formatDateTimeLocal(start)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:from-amber-600 hover:via-rose-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 font-semibold luxury-serif">
          <Plus className="h-5 w-5 mr-2" />
          Add Event
          <Sparkles className="h-4 w-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] wedding-card rounded-3xl border-rose-200/50">
        <DialogHeader className="text-center pb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center shadow-lg">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold luxury-serif bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            Add New Event
          </DialogTitle>
          <p className="text-rose-600/70 luxury-serif italic">Schedule another milestone in your journey</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-rose-800 font-semibold luxury-serif">
                Event Type *
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value: "appointment" | "deadline" | "meeting" | "event") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="appointment">📅 Appointment</SelectItem>
                  <SelectItem value="meeting">🤝 Meeting</SelectItem>
                  <SelectItem value="deadline">⏰ Deadline</SelectItem>
                  <SelectItem value="event">🎉 Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorId" className="text-rose-800 font-semibold luxury-serif">
                Related Vendor
              </Label>
              <Select
                value={formData.vendorId}
                onValueChange={(value) => setFormData({ ...formData, vendorId: value })}
              >
                <SelectTrigger className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">No vendor</SelectItem>
                  {state.vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name} ({vendor.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-rose-800 font-semibold luxury-serif">
              Event Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter event name"
              className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start" className="text-rose-800 font-semibold luxury-serif">
                Start Time *
              </Label>
              <Input
                id="start"
                type="datetime-local"
                value={formData.start || getDefaultStartTime()}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    start: e.target.value,
                    end: formData.end || getDefaultEndTime(e.target.value),
                  })
                }
                className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end" className="text-rose-800 font-semibold luxury-serif">
                End Time *
              </Label>
              <Input
                id="end"
                type="datetime-local"
                value={formData.end || (formData.start ? getDefaultEndTime(formData.start) : "")}
                onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact" className="text-rose-800 font-semibold luxury-serif">
              Contact Information
            </Label>
            <Input
              id="contact"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="Phone or email"
              className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-rose-800 font-semibold luxury-serif">
              Notes & Details
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details, agenda, preparation notes..."
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
              className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl shadow-lg font-semibold luxury-serif"
            >
              Create Event
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
