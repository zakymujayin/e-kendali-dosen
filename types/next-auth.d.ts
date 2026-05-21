import { Role } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    role: Role
    prodiId?: string | null
    avatar?: string | null
  }
  interface Session {
    user: {
      id: string
      role: Role
      prodiId?: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    prodiId?: string | null
  }
}
