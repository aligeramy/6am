"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

export default function EmailSignup() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    setIsSubmitted(true)

    // Reset after showing success message
    setTimeout(() => {
      setIsOpen(false)
      setTimeout(() => {
        setIsSubmitted(false)
        setEmail("")
      }, 500)
    }, 2000)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-zinc-400 hover:text-zinc-200 text-sm font-light tracking-wide transition-colors"
      >
        Sign up for updates
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => !isSubmitting && setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => !isSubmitting && setIsOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>

              {!isSubmitted ? (
                <>
                  <h2 className="text-xl font-light mb-6 text-center tracking-wide">Stay Updated</h2>
                  <p className="text-zinc-400 text-sm mb-6 text-center">
                    Sign up to receive updates about new releases and exclusive content.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email address"
                        required
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        disabled={isSubmitting}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Subscribe"}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <h2 className="text-xl font-light mb-2 tracking-wide">Thank You!</h2>
                  <p className="text-zinc-400 text-sm">You've been added to our mailing list.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
