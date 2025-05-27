import { useEffect, useState } from "react"

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark")
      setTheme("dark")
    } else {
      document.documentElement.classList.remove("dark")
      setTheme("light")
    }
  }, [])

  function toggleTheme() {
    if (theme === "dark") {
      document.documentElement.classList.remove("dark")
      localStorage.theme = "light"
      setTheme("light")
    } else {
      document.documentElement.classList.add("dark")
      localStorage.theme = "dark"
      setTheme("dark")
    }
  }

  return { theme, toggleTheme }
}
