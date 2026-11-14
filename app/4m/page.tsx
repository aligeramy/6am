"use client"

import dynamic from "next/dynamic"

// Client-only: everything lives in this phone's storage.
const FourM = dynamic(() => import("@/components/fourm/four-m"), {
  ssr: false,
  loading: () => <div className="fm-loading" />,
})

export default function FourMPage() {
  return <FourM />
}
