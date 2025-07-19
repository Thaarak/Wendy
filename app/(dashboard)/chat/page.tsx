"use client"

import { useWendyState } from "@/app/context/wendy-context"
import { ChatInterface } from "@/components/chat-interface"
import { MessageCircle } from "lucide-react"

export default function ChatPage() {
  const { state } = useWendyState()

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-400 shadow-lg">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-bold luxury-serif bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
              Chat with Wendy
            </h1>
            <p className="text-rose-600/70 mt-2 text-lg luxury-serif italic">Your AI wedding planning assistant</p>
          </div>
        </div>
      </div>

      <ChatInterface messages={state.messages} />
    </div>
  )
}
