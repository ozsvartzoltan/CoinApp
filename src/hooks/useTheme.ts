import { useEffect, useState } from "react"

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null)
  const [mounted, setMounted] = useState(false)

  // Initialize theme on mount
  useEffect(() => {
    const isDark =
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)

    setTheme(isDark ? "dark" : "light")
    updateDOM(isDark ? "dark" : "light")
    setMounted(true)
  }, [])

  function updateDOM(newTheme: "light" | "dark") {
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
      localStorage.theme = "dark"
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.theme = "light"
    }
  }

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    updateDOM(newTheme)
  }

  return {
    theme: mounted ? theme : null,
    toggleTheme,
    mounted,
  }
}
