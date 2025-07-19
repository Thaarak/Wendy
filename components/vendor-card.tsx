"use client"

import type { Vendor } from "@/app/context/wendy-context"
import { Mail, MapPin, User, Phone, StickyNote, Star, Copy, Check } from "lucide-react"
import { useState } from "react"
import { VendorDetailModal } from "./vendor-detail-modal"

interface VendorCardProps {
  vendor: Vendor
}

export function VendorCard({ vendor }: VendorCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  const getStatusColor = (status: Vendor["status"]) => {
    switch (status) {
      case "available":
        return "from-green-400 to-emerald-400"
      case "busy":
        return "from-yellow-400 to-amber-400"
      case "unavailable":
        return "from-red-400 to-rose-400"
      default:
        return "from-gray-400 to-slate-400"
    }
  }

  const getStatusText = (status: Vendor["status"]) => {
    switch (status) {
      case "available":
        return "Available"
      case "busy":
        return "Busy"
      case "unavailable":
        return "Unavailable"
      default:
        return "Unknown"
    }
  }

  return (
    <>
      <div
        className="group wedding-card rounded-3xl p-6 hover:shadow-2xl hover:shadow-rose-200/40 transition-all duration-500 hover:-translate-y-1 border border-rose-200/30 cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className={`p-4 rounded-2xl shadow-lg ${
                vendor.type === "venue"
                  ? "bg-gradient-to-br from-amber-400 to-orange-400"
                  : "bg-gradient-to-br from-rose-400 to-pink-400"
              }`}
            >
              {vendor.type === "venue" ? (
                <MapPin className="h-7 w-7 text-white" />
              ) : (
                <User className="h-7 w-7 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold text-rose-800 luxury-serif group-hover:text-rose-900 transition-colors">
                  {vendor.name}
                </h3>
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                    vendor.type === "venue"
                      ? "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200"
                      : "bg-gradient-to-r from-rose-100 to-pink-100 text-rose-800 border border-rose-200"
                  }`}
                >
                  {vendor.type}
                </span>
              </div>
              <p className="text-rose-600/80 text-base luxury-serif italic">{vendor.purpose}</p>
              {vendor.priceRange && <p className="text-sm text-amber-700 font-semibold mt-1">{vendor.priceRange}</p>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < vendor.rating ? "text-amber-400 fill-current" : "text-gray-300"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getStatusColor(vendor.status)}`}></div>
              <span className="text-xs font-medium text-gray-700">{getStatusText(vendor.status)}</span>
            </div>
          </div>
        </div>

        {/* Contact Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {vendor.contact && (
            <button
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-rose-50/50 to-pink-50/50 rounded-xl border border-rose-100/50 hover:from-rose-100/50 hover:to-pink-100/50 transition-all duration-200 text-left"
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(vendor.contact, "phone")
              }}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-rose-200 to-pink-200 flex-shrink-0">
                <Phone className="h-5 w-5 text-rose-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-rose-600/70 font-medium uppercase tracking-wide">Phone</p>
                <p className="text-sm text-rose-700 font-semibold truncate">{vendor.contact}</p>
              </div>
              <div className="flex-shrink-0">
                {copiedPhone ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-rose-400" />
                )}
              </div>
            </button>
          )}

          {vendor.contactEmail && (
            <button
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50/50 to-rose-50/50 rounded-xl border border-amber-100/50 hover:from-amber-100/50 hover:to-rose-100/50 transition-all duration-200 text-left"
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(vendor.contactEmail!, "email")
              }}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-200 to-rose-200 flex-shrink-0">
                <Mail className="h-5 w-5 text-amber-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-600/70 font-medium uppercase tracking-wide">Email</p>
                <p className="text-sm text-amber-700 font-semibold truncate" title={vendor.contactEmail}>
                  {vendor.contactEmail}
                </p>
              </div>
              <div className="flex-shrink-0">
                {copiedEmail ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-amber-400" />
                )}
              </div>
            </button>
          )}
        </div>

        {/* Notes Section */}
        {vendor.notes && (
          <div className="mb-6">
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-pink-50/50 to-rose-50/50 rounded-xl border border-pink-100/50">
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-200 to-rose-200 flex-shrink-0 mt-0.5">
                <StickyNote className="h-5 w-5 text-pink-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-pink-600/70 font-medium uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-pink-700 leading-relaxed line-clamp-3">{vendor.notes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Section */}
        <div className="pt-4 border-t border-rose-200/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-rose-600/70">
                Last contact: {new Date(vendor.lastContact || "").toLocaleDateString()}
              </span>
              {vendor.chatLogs.length > 0 && (
                <>
                  <div className="text-xs text-rose-500/70">•</div>
                  <span className="text-xs text-rose-600/70">{vendor.chatLogs.length} chat logs</span>
                </>
              )}
            </div>
            <button className="text-sm text-rose-600 hover:text-rose-800 font-medium luxury-serif italic transition-colors hover:underline">
              View Full Details →
            </button>
          </div>
        </div>
      </div>

      <VendorDetailModal vendor={vendor} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
