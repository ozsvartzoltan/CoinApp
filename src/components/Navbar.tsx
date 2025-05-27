"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/useTheme"
import { useContext } from "react"
import { AuthContext } from "@/contexts/authContext"
import Link from "next/link"

export default function Navbar() {
  const { toggleTheme } = useTheme()
  const context = useContext(AuthContext)
  if (!context) throw new Error("No context found for AuthContext")
  const { user, logout } = context

  return (
    <div className="w-full px-6 py-4 flex items-center border-b">
      <Link
        href="/home"
        className="text-xl font-semibold pl-12"
        aria-label="logo"
      >
        CoinApp
      </Link>
      <div className="flex w-full justify-end gap-3">
        <Button variant="outline" onClick={toggleTheme}>
          Theme
        </Button>
        {user && (
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        )}
      </div>
    </div>
  )
}
