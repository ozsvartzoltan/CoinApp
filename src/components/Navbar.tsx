"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTheme } from "@/hooks/useTheme"
import { useContext } from "react"
import { AuthContext } from "@/contexts/authContext"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, LogIn, Moon, Search, Sun, UserPlus, UserRound } from "lucide-react"

const navItems = [
  {
    href: "/search",
    label: "Search",
    icon: Search,
  },
  {
    href: "/collection",
    label: "Collection",
    icon: LayoutGrid,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: UserRound,
  },
]

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const context = useContext(AuthContext)
  if (!context) throw new Error("No context found for AuthContext")
  const { user, logout } = context

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/search"
          className="flex shrink-0 items-center gap-3 rounded-full border border-border/60 bg-background px-3 py-2 shadow-sm transition-transform hover:-translate-y-0.5"
          aria-label="CoinApp search"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            C
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              CoinApp
            </span>
            <span className="text-xs text-muted-foreground">
              Track your collection
            </span>
          </span>
        </Link>

        {user && (
          <nav className="hidden flex-1 justify-center md:flex">
            <div className="flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 p-1 shadow-sm">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`)

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </nav>
        )}

        {!user && (
          <nav className="hidden flex-1 justify-center md:flex">
            <div className="flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 p-1 shadow-sm">
              <span className="px-4 py-2 text-sm font-medium text-muted-foreground">
                Browse the catalog, then sign in to save coins
              </span>
            </div>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="hidden max-w-48 flex-col text-right lg:flex">
              <span className="truncate text-sm font-medium text-foreground">
                {user.email}
              </span>
              <span className="text-xs text-muted-foreground">Signed in</span>
            </div>
          )}

          {!user && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/login">
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
              </Button>
              <Button asChild className="rounded-full">
                <Link href="/register">
                  <UserPlus className="h-4 w-4" />
                  Register
                </Link>
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="shrink-0 rounded-full"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {user && (
            <Button
              variant="outline"
              onClick={logout}
              className="hidden rounded-full sm:inline-flex"
            >
              Logout
            </Button>
          )}
        </div>
      </div>

      {user && (
        <div className="border-t border-border/60 bg-background/80 px-4 pb-3 pt-3 md:hidden">
          <nav className="flex items-center gap-2 overflow-x-auto pb-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
