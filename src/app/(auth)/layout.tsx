import { AuthProvider } from "@/contexts/authContext"

export const metadata = {
  title: "Coin App - Auth",
  description: "Login to your Coin App account",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="p-6">{children}</div>
    </AuthProvider>
  )
}
