"use client"

import type React from "react"
import { createContext, useContext, useReducer, type ReactNode } from "react"

// Enhanced Types with JSON-compliant structure
export type ChatLog = {
  id: string
  timestamp: string
  sender: "wendy" | "vendor" | "user"
  message: string
  type: "email" | "phone" | "meeting" | "note"
}

export type Vendor = {
  id: string
  type: "venue" | "vendor"
  name: string
  contact: string
  notes?: string
  contactEmail?: string
  purpose: string
  chatLogs: ChatLog[] // Added chat logs
  status: "available" | "busy" | "unavailable" // Added status
  rating: number // Added rating (1-5)
  website?: string // Added website
  address?: string // Added address
  priceRange?: string // Added price range
  lastContact?: string // Added last contact date
}

export type Guest = {
  id: string
  name: string
  rsvp: "yes" | "no" | "maybe" | "unknown"
  contact?: string
  notes?: string
}

export type CalEvent = {
  id: string
  type: "appointment" | "deadline" | "meeting" | "event"
  name: string
  title: string
  start: string
  end: string
  contact?: string
  notes?: string
  vendorId?: string
}

export type Message = {
  id: string
  sender: "user" | "wendy"
  text: string
  ts: string
}

export type WendyState = {
  vendors: Vendor[]
  guests: Guest[]
  events: CalEvent[]
  messages: Message[]
  logs: { ts: string; msg: string }[]
}

// JSON Creation Functions
export function createVendorFromJSON(json: {
  type: "venue" | "vendor"
  name: string
  contact: string
  notes?: string
  purpose?: string
  contactEmail?: string
  website?: string
  address?: string
  priceRange?: string
}): Vendor {
  return {
    id: Date.now().toString(),
    type: json.type,
    name: json.name,
    contact: json.contact,
    notes: json.notes,
    purpose: json.purpose || json.type,
    contactEmail: json.contactEmail,
    website: json.website,
    address: json.address,
    priceRange: json.priceRange,
    chatLogs: [],
    status: "available",
    rating: 5,
    lastContact: new Date().toISOString(),
  }
}

export function createChatLogFromJSON(json: {
  vendorId: string
  sender: "wendy" | "vendor" | "user"
  message: string
  type: "email" | "phone" | "meeting" | "note"
}): { vendorId: string; chatLog: ChatLog } {
  return {
    vendorId: json.vendorId,
    chatLog: {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      sender: json.sender,
      message: json.message,
      type: json.type,
    },
  }
}

export function createEventFromJSON(json: {
  type: "appointment" | "deadline" | "meeting" | "event"
  name: string
  start: string
  end: string
  contact?: string
  notes?: string
  vendorId?: string
}): CalEvent {
  return {
    id: Date.now().toString(),
    type: json.type,
    name: json.name,
    title: json.name,
    start: json.start,
    end: json.end,
    contact: json.contact,
    notes: json.notes,
    vendorId: json.vendorId,
  }
}

export function createGuestFromJSON(json: {
  name: string
  contact?: string
  notes?: string
  rsvp?: "yes" | "no" | "maybe" | "unknown"
}): Guest {
  return {
    id: Date.now().toString(),
    name: json.name,
    contact: json.contact,
    notes: json.notes,
    rsvp: json.rsvp || "unknown",
  }
}

type WendyAction =
  | { type: "add_vendor"; payload: Vendor }
  | { type: "update_guest"; payload: Guest }
  | { type: "add_event"; payload: CalEvent }
  | { type: "add_message"; payload: Message }
  | { type: "add_log"; payload: { msg: string } }
  | { type: "create_vendor_from_json"; payload: Parameters<typeof createVendorFromJSON>[0] }
  | { type: "create_event_from_json"; payload: Parameters<typeof createEventFromJSON>[0] }
  | { type: "create_guest_from_json"; payload: Parameters<typeof createGuestFromJSON>[0] }
  | { type: "add_chat_log"; payload: { vendorId: string; chatLog: ChatLog } }
  | { type: "update_vendor"; payload: Vendor }

// Updated sample data with new structure
const initialState: WendyState = {
  vendors: [
    {
      id: "1",
      type: "venue",
      name: "Grand Ballroom Hotel",
      contact: "+1 (555) 123-4567",
      notes:
        "Beautiful venue with capacity for 200 guests. Includes tables, chairs, and basic lighting. Catering kitchen available.",
      purpose: "Wedding Venue",
      contactEmail: "events@grandballroom.com",
      website: "www.grandballroom.com",
      address: "123 Elegant Street, Wedding City, WC 12345",
      priceRange: "$5,000 - $8,000",
      status: "available",
      rating: 5,
      lastContact: "2024-01-15T10:00:00Z",
      chatLogs: [
        {
          id: "1",
          timestamp: "2024-01-15T10:00:00Z",
          sender: "wendy",
          message: "Initial contact made with Grand Ballroom Hotel. Discussed availability for your wedding date.",
          type: "note",
        },
        {
          id: "2",
          timestamp: "2024-01-15T14:30:00Z",
          sender: "vendor",
          message: "Confirmed availability for your date. Sent pricing package and menu options.",
          type: "email",
        },
      ],
    },
    {
      id: "2",
      type: "vendor",
      name: "Bloom & Blossom",
      contact: "+1 (555) 234-5678",
      notes: "Specializes in romantic floral arrangements. Award-winning florist with 15 years experience.",
      purpose: "Florist",
      contactEmail: "hello@bloomblossom.com",
      website: "www.bloomblossom.com",
      address: "456 Flower Lane, Garden City, GC 67890",
      priceRange: "$800 - $2,500",
      status: "available",
      rating: 5,
      lastContact: "2024-01-16T09:15:00Z",
      chatLogs: [
        {
          id: "3",
          timestamp: "2024-01-16T09:15:00Z",
          sender: "wendy",
          message: "Reached out to discuss floral arrangements for ceremony and reception.",
          type: "phone",
        },
      ],
    },
    {
      id: "3",
      type: "vendor",
      name: "Capture Moments",
      contact: "+1 (555) 345-6789",
      notes: "Award-winning wedding photography team. Specializes in candid moments and artistic shots.",
      purpose: "Photography",
      contactEmail: "info@capturemoments.com",
      website: "www.capturemoments.com",
      address: "789 Shutter Street, Photo City, PC 13579",
      priceRange: "$2,000 - $4,500",
      status: "busy",
      rating: 5,
      lastContact: "2024-01-14T16:45:00Z",
      chatLogs: [
        {
          id: "4",
          timestamp: "2024-01-14T16:45:00Z",
          sender: "wendy",
          message: "Scheduled consultation meeting for next week to review portfolio and packages.",
          type: "meeting",
        },
      ],
    },
    {
      id: "4",
      type: "vendor",
      name: "Sweet Dreams Bakery",
      contact: "+1 (555) 456-7890",
      notes: "Custom wedding cakes and desserts. Specializes in multi-tier cakes and dietary restrictions.",
      purpose: "Wedding Cake",
      contactEmail: "orders@sweetdreams.com",
      website: "www.sweetdreamsbakery.com",
      address: "321 Baker Street, Sweet City, SC 24680",
      priceRange: "$300 - $1,200",
      status: "available",
      rating: 4,
      lastContact: "2024-01-17T11:20:00Z",
      chatLogs: [],
    },
  ],
  guests: [
    {
      id: "1",
      name: "Sarah Johnson",
      contact: "sarah.j@email.com",
      rsvp: "yes",
      notes: "Vegetarian meal preference",
    },
    {
      id: "2",
      name: "Mike Chen",
      contact: "mike.chen@email.com",
      rsvp: "yes",
      notes: "No dietary restrictions",
    },
    {
      id: "3",
      name: "Emily Davis",
      contact: "emily.davis@email.com",
      rsvp: "maybe",
      notes: "Gluten-free meal required",
    },
    {
      id: "4",
      name: "Robert Wilson",
      contact: "rob.wilson@email.com",
      rsvp: "unknown",
      notes: "",
    },
  ],
  events: [
    {
      id: "1",
      type: "appointment",
      name: "Venue Visit - Grand Ballroom",
      title: "Venue Visit - Grand Ballroom",
      start: "2024-02-15T14:00:00",
      end: "2024-02-15T15:30:00",
      contact: "+1 (555) 123-4567",
      notes: "Tour the venue and discuss pricing",
      vendorId: "1",
    },
    {
      id: "2",
      type: "appointment",
      name: "Cake Tasting",
      title: "Cake Tasting",
      start: "2024-02-20T16:00:00",
      end: "2024-02-20T17:00:00",
      contact: "+1 (555) 456-7890",
      notes: "Try different cake flavors and designs",
      vendorId: "4",
    },
    {
      id: "3",
      type: "meeting",
      name: "Photography Consultation",
      title: "Photography Consultation",
      start: "2024-02-25T10:00:00",
      end: "2024-02-25T11:00:00",
      contact: "+1 (555) 345-6789",
      notes: "Discuss photography package and timeline",
      vendorId: "3",
    },
  ],
  messages: [
    {
      id: "1",
      sender: "wendy",
      text: "Hello! I'm Wendy, your AI wedding planner. How can I help you today?",
      ts: "2024-01-15T09:00:00Z",
    },
    {
      id: "2",
      sender: "user",
      text: "Hi Wendy! I need help organizing my wedding timeline.",
      ts: "2024-01-15T09:05:00Z",
    },
    {
      id: "3",
      sender: "wendy",
      text: "I'd be happy to help! Let's start by reviewing your current vendors and upcoming appointments.",
      ts: "2024-01-15T09:06:00Z",
    },
  ],
  logs: [
    { ts: "2024-01-15T09:00:00Z", msg: "System initialized" },
    { ts: "2024-01-15T09:05:00Z", msg: "User started chat session" },
    { ts: "2024-01-15T09:10:00Z", msg: "Loaded 4 vendors, 4 guests, 3 events" },
  ],
}

// Enhanced Reducer with chat log support
function wendyReducer(state: WendyState, action: WendyAction): WendyState {
  const now = new Date().toISOString()

  switch (action.type) {
    case "add_vendor":
      return {
        ...state,
        vendors: [...state.vendors, action.payload],
        logs: [...state.logs, { ts: now, msg: `Added vendor: ${action.payload.name}` }],
      }

    case "update_vendor":
      return {
        ...state,
        vendors: state.vendors.map((vendor) => (vendor.id === action.payload.id ? action.payload : vendor)),
        logs: [...state.logs, { ts: now, msg: `Updated vendor: ${action.payload.name}` }],
      }

    case "add_chat_log":
      return {
        ...state,
        vendors: state.vendors.map((vendor) =>
          vendor.id === action.payload.vendorId
            ? { ...vendor, chatLogs: [...vendor.chatLogs, action.payload.chatLog], lastContact: now }
            : vendor,
        ),
        logs: [...state.logs, { ts: now, msg: `Added chat log for vendor` }],
      }

    case "create_vendor_from_json":
      const newVendor = createVendorFromJSON(action.payload)
      return {
        ...state,
        vendors: [...state.vendors, newVendor],
        logs: [...state.logs, { ts: now, msg: `Created vendor from JSON: ${newVendor.name}` }],
      }

    case "create_event_from_json":
      const newEvent = createEventFromJSON(action.payload)
      return {
        ...state,
        events: [...state.events, newEvent],
        logs: [...state.logs, { ts: now, msg: `Created event from JSON: ${newEvent.name}` }],
      }

    case "create_guest_from_json":
      const newGuest = createGuestFromJSON(action.payload)
      return {
        ...state,
        guests: [...state.guests, newGuest],
        logs: [...state.logs, { ts: now, msg: `Created guest from JSON: ${newGuest.name}` }],
      }

    case "update_guest":
      return {
        ...state,
        guests: state.guests.map((guest) => (guest.id === action.payload.id ? action.payload : guest)),
        logs: [...state.logs, { ts: now, msg: `Updated guest: ${action.payload.name}` }],
      }

    case "add_event":
      return {
        ...state,
        events: [...state.events, action.payload],
        logs: [...state.logs, { ts: now, msg: `Added event: ${action.payload.title}` }],
      }

    case "add_message":
      return {
        ...state,
        messages: [...state.messages, action.payload],
        logs: [...state.logs, { ts: now, msg: `New message from ${action.payload.sender}` }],
      }

    case "add_log":
      return {
        ...state,
        logs: [...state.logs, { ts: now, msg: action.payload.msg }],
      }

    default:
      return state
  }
}

// Context
const WendyContext = createContext<{
  state: WendyState
  dispatch: React.Dispatch<WendyAction>
} | null>(null)

// Provider
export function WendyStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wendyReducer, initialState)

  return <WendyContext.Provider value={{ state, dispatch }}>{children}</WendyContext.Provider>
}

// Hook
export function useWendyState() {
  const context = useContext(WendyContext)
  if (!context) {
    throw new Error("useWendyState must be used within WendyStateProvider")
  }
  return context
}
