import type { Metadata } from "next"
import "../globals.css"
import { AuthProvider } from "@/contexts/authContext"

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
    <AuthProvider>
      <div className="p-6">{children}</div>
    </AuthProvider>
  )
}
