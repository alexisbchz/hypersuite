import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils"
import { Analytics } from "@vercel/analytics/next"

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://suite.alexisbouchez.com"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Hypersuite",
    template: "%s - Hypersuite",
  },
  description: "An open source creativity suite.",
  applicationName: "Hypersuite",
  authors: [{ name: "Alexis Bouchez", url: "https://github.com/alexisbchz" }],
  creator: "Alexis Bouchez",
  publisher: "Alexis Bouchez",
  keywords: [
    "Hypersuite",
    "creativity suite",
    "open source",
    "image editor",
    "audio",
    "AI",
    "in-browser",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Hypersuite",
    description: "An open source creativity suite.",
    siteName: "Hypersuite",
    type: "website",
    locale: "en_US",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Hypersuite",
    description: "An open source creativity suite.",
    creator: "@alexisbchz",
  },
}

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
