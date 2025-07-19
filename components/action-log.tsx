"use client"

import { useWendyState } from "@/app/context/wendy-context"
import { useEffect, useRef, useState } from "react"
import { Scroll, X } from "lucide-react"

export function ActionLog() {
  const { state } = useWendyState()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [state.logs])

  return (
    <div className={`fixed bottom-6 right-6 transition-all duration-300 z-10 ${isOpen ? "w-96 h-72" : "w-16 h-16"}`}>
      {isOpen ? (
        <div className="wedding-card rounded-3xl shadow-2xl shadow-rose-200/30 border border-rose-200/50 backdrop-blur-md h-full">
          <div className="p-4 border-b border-rose-200/30 bg-gradient-to-r from-amber-50/50 to-rose-50/50 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-rose-400">
                <Scroll className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-rose-800 serif">Activity Journal</h3>
                <p className="text-xs text-rose-600/70">Your planning progress</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-rose-100/50 transition-colors"
              >
                <X className="h-4 w-4 text-rose-600" />
              </button>
            </div>
          </div>
          <div ref={scrollRef} className="p-4 h-52 overflow-y-auto font-mono text-xs space-y-2">
            {state.logs.map((log, index) => (
              <div
                key={index}
                className="flex gap-3 p-2 rounded-lg bg-gradient-to-r from-rose-50/30 to-pink-50/30 border border-rose-100/30"
              >
                <span className="text-amber-600 shrink-0 font-semibold">{new Date(log.ts).toLocaleTimeString()}</span>
                <span className="text-rose-700">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 shadow-2xl shadow-rose-200/30 flex items-center justify-center hover:scale-110 transition-all duration-300 border-2 border-white"
        >
          <Scroll className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
  )
}
