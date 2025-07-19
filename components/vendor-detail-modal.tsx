"use client"

import type { Vendor, ChatLog } from "@/app/context/wendy-context"
import { useWendyState } from "@/app/context/wendy-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Mail,
  MapPin,
  User,
  Phone,
  StickyNote,
  Star,
  Copy,
  Check,
  Globe,
  MessageCircle,
  Bot,
  Building,
  DollarSign,
  Calendar,
} from "lucide-react"
import { useState } from "react"

interface VendorDetailModalProps {
  vendor: Vendor
  isOpen: boolean
  onClose: () => void
}

export function VendorDetailModal({ vendor, isOpen, onClose }: VendorDetailModalProps) {
  const { dispatch } = useWendyState()
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const copyToClipboard = async (text: string, type: "phone" | "email") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "phone") {
        setCopiedPhone(true)
        setTimeout(() => setCopiedPhone(false), 2000)
      } else {
        setCopiedEmail(true)
        setTimeout(() => setCopiedEmail(false), 2000)
      }
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  const getChatTypeIcon = (type: ChatLog["type"]) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "phone":
        return <Phone className="h-4 w-4" />
      case "meeting":
        return <Calendar className="h-4 w-4" />
      default:
        return <StickyNote className="h-4 w-4" />
    }
  }

  const getChatTypeColor = (type: ChatLog["type"]) => {
    switch (type) {
      case "email":
        return "text-blue-600 bg-blue-50"
      case "phone":
        return "text-green-600 bg-green-50"
      case "meeting":
        return "text-purple-600 bg-purple-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getSenderIcon = (sender: ChatLog["sender"]) => {
    switch (sender) {
      case "wendy":
        return <Bot className="h-4 w-4 text-rose-600" />
      case "vendor":
        return <Building className="h-4 w-4 text-amber-600" />
      default:
        return <User className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto wedding-card rounded-3xl border-rose-200/50">
        <DialogHeader className="pb-6 border-b border-rose-200/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`p-4 rounded-2xl shadow-lg ${
                  vendor.type === "venue"
                    ? "bg-gradient-to-br from-amber-400 to-orange-400"
                    : "bg-gradient-to-br from-rose-400 to-pink-400"
                }`}
              >
                {vendor.type === "venue" ? (
                  <MapPin className="h-8 w-8 text-white" />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <div>
                <DialogTitle className="text-3xl font-bold luxury-serif bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                  {vendor.name}
                </DialogTitle>
                <p className="text-rose-600/80 text-lg luxury-serif italic mt-1">{vendor.purpose}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < vendor.rating ? "text-amber-400 fill-current" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">({vendor.rating}/5)</span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-6">
          {/* Left Column - Details */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold luxury-serif text-rose-800">Contact Information</h3>

              {vendor.contact && (
                <button
                  className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-rose-50/50 to-pink-50/50 rounded-xl border border-rose-100/50 hover:from-rose-100/50 hover:to-pink-100/50 transition-all duration-200 text-left"
                  onClick={() => copyToClipboard(vendor.contact, "phone")}
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-rose-200 to-pink-200">
                    <Phone className="h-5 w-5 text-rose-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-rose-600/70 font-medium uppercase tracking-wide">Phone</p>
                    <p className="text-sm text-rose-700 font-semibold">{vendor.contact}</p>
                  </div>
                  {copiedPhone ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-rose-400" />
                  )}
                </button>
              )}

              {vendor.contactEmail && (
                <button
                  className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50/50 to-rose-50/50 rounded-xl border border-amber-100/50 hover:from-amber-100/50 hover:to-rose-100/50 transition-all duration-200 text-left"
                  onClick={() => copyToClipboard(vendor.contactEmail!, "email")}
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-200 to-rose-200">
                    <Mail className="h-5 w-5 text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-amber-600/70 font-medium uppercase tracking-wide">Email</p>
                    <p className="text-sm text-amber-700 font-semibold">{vendor.contactEmail}</p>
                  </div>
                  {copiedEmail ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-amber-400" />
                  )}
                </button>
              )}

              {vendor.website && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl border border-blue-100/50">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-200 to-indigo-200">
                    <Globe className="h-5 w-5 text-blue-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-blue-600/70 font-medium uppercase tracking-wide">Website</p>
                    <a
                      href={`https://${vendor.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-700 font-semibold hover:underline"
                    >
                      {vendor.website}
                    </a>
                  </div>
                </div>
              )}

              {vendor.address && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50/50 to-emerald-50/50 rounded-xl border border-green-100/50">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-200 to-emerald-200">
                    <MapPin className="h-5 w-5 text-green-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-green-600/70 font-medium uppercase tracking-wide">Address</p>
                    <p className="text-sm text-green-700 font-semibold">{vendor.address}</p>
                  </div>
                </div>
              )}

              {vendor.priceRange && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50/50 to-amber-50/50 rounded-xl border border-yellow-100/50">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-200 to-amber-200">
                    <DollarSign className="h-5 w-5 text-yellow-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-yellow-600/70 font-medium uppercase tracking-wide">Price Range</p>
                    <p className="text-sm text-yellow-700 font-semibold">{vendor.priceRange}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {vendor.notes && (
              <div>
                <h3 className="text-xl font-bold luxury-serif text-rose-800 mb-4">Notes & Details</h3>
                <div className="p-4 bg-gradient-to-r from-pink-50/50 to-rose-50/50 rounded-xl border border-pink-100/50">
                  <p className="text-sm text-pink-700 leading-relaxed">{vendor.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Chat Logs */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="h-6 w-6 text-rose-600" />
              <h3 className="text-xl font-bold luxury-serif text-rose-800">Communication Log</h3>
            </div>

            {/* Chat Log Display */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {vendor.chatLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No communication logs yet</p>
                </div>
              ) : (
                vendor.chatLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-white/60 rounded-xl border border-rose-100/50">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">{getSenderIcon(log.sender)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold capitalize">{log.sender}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getChatTypeColor(
                              log.type,
                            )}`}
                          >
                            {getChatTypeIcon(log.type)}
                            {log.type}
                          </span>
                          <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-700">{log.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
