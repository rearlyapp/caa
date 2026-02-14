import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  title: "CAA - Company Formation Automation",
  description:
    "Document-first workflow automation for CA/CS firms to streamline company formation with AI-powered KYC extraction.",
}

export const viewport: Viewport = {
  themeColor: "#1a6ed8",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  )
}
