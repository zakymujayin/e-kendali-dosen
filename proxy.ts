import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Role } from "@prisma/client"

const publicPaths = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]

const roleRedirects: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  DOSEN: "/dashboard/dosen",
  GKM: "/dashboard/gkm",
  DEKANAT: "/dashboard/dekanat",
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))
  const isAuthApi = pathname.startsWith("/api/auth/")
  const isApi = pathname.startsWith("/api/")
  const isStatic = pathname.startsWith("/_next") || pathname === "/favicon.ico"

  if (isStatic || isAuthApi) return

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const user = token as { role: Role; id: string; prodiId?: string | null } | null

  if (!user && !isPublic && !isApi) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (!user && isApi && !isAuthApi) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    )
  }

  if (user && pathname === "/login") {
    const redirect = roleRedirects[user.role as string] || "/dashboard/dosen"
    return NextResponse.redirect(new URL(redirect, req.url))
  }

  if (user && pathname === "/") {
    const redirect = roleRedirects[user.role as string] || "/dashboard/dosen"
    return NextResponse.redirect(new URL(redirect, req.url))
  }

  if (user && pathname.startsWith("/dashboard")) {
    const segment = pathname.split("/")[2]
    if (segment === "admin" && user.role !== "ADMIN") {
      return NextResponse.redirect(new URL(roleRedirects[user.role as string] || "/login", req.url))
    }
    if (segment === "dosen" && user.role !== "DOSEN") {
      return NextResponse.redirect(new URL(roleRedirects[user.role as string] || "/login", req.url))
    }
    if (segment === "gkm" && user.role !== "GKM") {
      return NextResponse.redirect(new URL(roleRedirects[user.role as string] || "/login", req.url))
    }
    if (segment === "dekanat" && user.role !== "DEKANAT") {
      return NextResponse.redirect(new URL(roleRedirects[user.role as string] || "/login", req.url))
    }
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
