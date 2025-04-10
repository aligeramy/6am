"use client"

import Image from "next/image"
import EmailSignup from "@/components/ui/email-signup"

export default function Header() {
  return (
    <header className="flex justify-center items-center p-6 md:p-8 z-10 backdrop-blur-md bg-transparent">
      <div className="w-full max-w-6xl flex justify-between items-center">
        <div className="h-8 md:h-10 ml-4 md:ml-6 justify-start">
          <Image src="/images/logo.png" alt="Logo" width={120} height={40} className="h-full w-auto" />
        </div>
        <div className="mr-4 md:mr-6">
          <EmailSignup />
        </div>
      </div>
    </header>
  )
}
