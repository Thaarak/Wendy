"use client"

import { useWendyState } from "@/app/context/wendy-context"
import { VendorCard } from "@/components/vendor-card"
import { CreateVendorDialog } from "@/components/create-vendor-dialog"
import { Heart, Filter, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function VendorsPage() {
  const { state } = useWendyState()

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-12">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-400 shadow-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold luxury-serif bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
                  Vendors & Venues
                </h1>
                <p className="text-rose-600/70 mt-2 text-lg luxury-serif italic">
                  Your dream team of wedding professionals
                </p>
              </div>
            </div>
          </div>
          <div className="ml-8">
            <CreateVendorDialog />
          </div>
        </div>

        {/* Search and Filter Bar */}
        {state.vendors.length > 0 && (
          <div className="mt-8 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-rose-400" />
              <Input
                placeholder="Search vendors and venues..."
                className="pl-10 rounded-xl border-rose-200 focus:border-rose-400 bg-white/80"
              />
            </div>
            <Button
              variant="outline"
              className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 bg-transparent"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        )}
      </div>

      {state.vendors.length === 0 ? (
        <div className="text-center py-20">
          <div className="wedding-card rounded-3xl p-12 max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
              <Heart className="h-10 w-10 text-rose-400" />
            </div>
            <h3 className="text-2xl font-bold text-rose-800 mb-3 luxury-serif">No vendors yet</h3>
            <p className="text-rose-600/70 mb-8 luxury-serif">
              Let's start building your dream team of wedding professionals
            </p>
            <CreateVendorDialog />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {state.vendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  )
}
