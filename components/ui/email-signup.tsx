"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import { X } from "lucide-react"

// Define props for the Modal component
interface ModalProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  email: string
  setEmail: (email: string) => void
  handleSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
  isSubmitted: boolean
}

// Define Modal component outside EmailSignup
const Modal = ({
  isOpen,
  setIsOpen,
  email,
  setEmail,
  handleSubmit,
  isSubmitting,
  isSubmitted,
}: ModalProps) => (
  <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 2147483647 }}>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      onClick={() => !isSubmitting && setIsOpen(false)}
    />
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md relative"
      style={{ zIndex: 2147483647 }}
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
  </div>
)

export default function EmailSignup() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Only mount the portal on the client side
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

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
        className="group text-zinc-400 hover:text-zinc-200 text-xs font-medium tracking-wide transition-colors uppercase relative"
      >
        Sign up for updates
        <span className="absolute -bottom-1 left-0 w-full h-px bg-zinc-400 group-hover:bg-zinc-200 transform origin-left transition-all duration-300 ease-out group-hover:scale-x-100 scale-x-100"></span>
      </button>

      {mounted &&
        isOpen &&
        createPortal(
          <Modal
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            email={email}
            setEmail={setEmail}
            handleSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isSubmitted={isSubmitted}
          />,
          document.body,
        )}
    </>
  )
}
