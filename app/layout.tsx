import type React from "react"
import type { Metadata } from "next"
import { Onest } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

/* Using only Onest font for a clean, professional dental theme */
const onest = Onest({
  subsets: ["latin"], // default subset (can’t be removed, required by Next)
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Dr.Mohammad Alsheikh Dental Center",
  description: "Comprehensive Dental Clinic Management System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={onest.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
