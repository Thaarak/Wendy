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
import { Plus, Sparkles, Heart } from "lucide-react"

export function CreateVendorDialog() {
  const { dispatch } = useWendyState()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: "" as "venue" | "vendor" | "",
    name: "",
    contact: "",
    notes: "",
    purpose: "",
    contactEmail: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.type || !formData.name || !formData.contact) {
      alert("Please fill in all required fields")
      return
    }

    dispatch({
      type: "create_vendor_from_json",
      payload: {
        type: formData.type as "venue" | "vendor",
        name: formData.name,
        contact: formData.contact,
        notes: formData.notes || undefined,
        purpose: formData.purpose || undefined,
        contactEmail: formData.contactEmail || undefined,
      },
    })

    // Reset form and close dialog
    setFormData({
      type: "",
      name: "",
      contact: "",
      notes: "",
      purpose: "",
      contactEmail: "",
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:from-amber-600 hover:via-rose-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 font-semibold luxury-serif">
          <Plus className="h-5 w-5 mr-2" />
          Add Vendor/Venue
          <Sparkles className="h-4 w-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] wedding-card rounded-3xl border-rose-200/50">
        <DialogHeader className="text-center pb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center shadow-lg">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold luxury-serif bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            Add New Vendor/Venue
          </DialogTitle>
          <p className="text-rose-600/70 luxury-serif italic">Let's add another member to your dream team</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-rose-800 font-semibold luxury-serif">
                Type *
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value: "venue" | "vendor") => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="venue">🏛️ Venue</SelectItem>
                  <SelectItem value="vendor">👥 Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose" className="text-rose-800 font-semibold luxury-serif">
                Purpose/Service
              </Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., Photography, Catering"
                className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-rose-800 font-semibold luxury-serif">
              Business Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter business name"
              className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact" className="text-rose-800 font-semibold luxury-serif">
                Phone Number *
              </Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="(555) 123-4567"
                className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-rose-800 font-semibold luxury-serif">
                Email Address
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="contact@business.com"
                className="rounded-xl border-rose-200 focus:border-rose-400 bg-rose-50/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-rose-800 font-semibold luxury-serif">
              Notes & Details
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any special notes, pricing details, or important information..."
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
              Create {formData.type || "Vendor/Venue"}
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
