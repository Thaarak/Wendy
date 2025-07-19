"use client"

import type React from "react"

import { type Message, useWendyState } from "@/app/context/wendy-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, Sparkles, Heart } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface ChatInterfaceProps {
  messages: Message[]
}

export function ChatInterface({ messages }: ChatInterfaceProps) {
  const { dispatch } = useWendyState()
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputValue,
      ts: new Date().toISOString(),
    }

    dispatch({ type: "add_message", payload: userMessage })

    // API integration - POST /api/chat with user message
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputValue }),
      })
      const data = await res.json()
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: "wendy",
        text: data.reply || "(No response)",
        ts: new Date().toISOString(),
      }
      dispatch({ type: "add_message", payload: aiResponse })
    } catch (err) {
      const errorResponse: Message = {
        id: (Date.now() + 2).toString(),
        sender: "wendy",
        text: "Sorry, there was an error contacting Wendy's brain!",
        ts: new Date().toISOString(),
      }
      dispatch({ type: "add_message", payload: errorResponse })
    }

    setInputValue("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend()
    }
  }

  return (
    <div className="wedding-card rounded-3xl shadow-xl shadow-rose-200/30 border border-rose-200/50 h-[700px] flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-pink-50 p-6 border-b border-rose-200/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center shadow-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold luxury-serif text-rose-800">Wendy AI Assistant</h2>
            <p className="text-rose-600/70 text-sm luxury-serif italic">Your personal wedding planning companion</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            <span className="text-sm text-rose-600 font-medium">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-rose-50/20 to-pink-50/20">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-4 ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            {message.sender === "wendy" && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center shadow-lg flex-shrink-0">
                <Bot className="h-5 w-5 text-white" />
              </div>
            )}

            <div
              className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-lg ${
                message.sender === "user"
                  ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                  : "bg-white border border-rose-200/50 text-gray-900"
              }`}
            >
              <p className="text-sm leading-relaxed">{message.text}</p>
              <div className="flex items-center gap-2 mt-3">
                <p
                  className={`text-xs ${
                    message.sender === "user" ? "text-rose-100" : "text-gray-500"
                  } luxury-serif italic`}
                >
                  {new Date(message.ts).toLocaleTimeString()}
                </p>
                {message.sender === "wendy" && <Sparkles className="h-3 w-3 text-amber-500" />}
              </div>
            </div>

            {message.sender === "user" && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center shadow-lg flex-shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-rose-200/30 p-6 bg-gradient-to-r from-rose-50/30 to-pink-50/30">
        <div className="flex gap-4">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Wendy about your wedding planning..."
            className="flex-1 rounded-2xl border-rose-200 focus:border-rose-400 bg-white/80 px-6 py-3 text-sm luxury-serif placeholder:text-rose-400"
          />
          <Button
            onClick={handleSend}
            className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={!inputValue.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <p className="text-xs text-rose-600/70 luxury-serif italic">
            Powered by AI • Here to make your wedding dreams come true
          </p>
        </div>
      </div>
    </div>
  )
}
