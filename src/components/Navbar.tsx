"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/useTheme"
import { useContext } from "react"
import { AuthContext } from "@/contexts/authContext"
import Link from "next/link"
import { Sun, Moon } from "lucide-react"

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const context = useContext(AuthContext)
  if (!context) throw new Error("No context found for AuthContext")
  const { user, logout } = context

  return (
    <div className="w-full px-6 py-4 flex items-center justify-between border-b bg-background">
      <Link
        href="/home"
        className="text-xl font-semibold"
        aria-label="logo"
      >
        CoinApp
      </Link>
      <div className="flex items-center gap-6">
        {user && (
          <nav className="flex gap-4">
            <Link
              href="/search"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Search
            </Link>
            <Link
              href="/collection"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Collection
            </Link>
            <Link
              href="/profile"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Profile
            </Link>
          </nav>
        )}
        <div className="flex items-center gap-2">
          {user && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{user.email}</span>
            </span>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          {user && (
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
