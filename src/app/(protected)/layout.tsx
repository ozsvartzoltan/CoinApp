import type { Metadata } from "next"
import "../globals.css"
import Navbar from "@/components/Navbar"

export const metadata: Metadata = {
  title: "Coin App",
  description: "Track your coin and paper money collection.",
}

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="p-6">{children}</main>
      </body>
    </html>
  )
}
