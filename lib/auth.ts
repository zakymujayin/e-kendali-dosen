import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const { username, password } = credentials as {
          username: string
          password: string
        }

        const user = await prisma.user.findUnique({ where: { username } })
        if (!user) return null
        if (!user.isActive) return null

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          prodiId: user.prodiId,
          avatar: user.avatar,
        }
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user, trigger, session }) => {
      if (user) {
        token.id = user.id ?? ""
        token.role = user.role
        token.prodiId = user.prodiId
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name
      }
      return token
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as any
        session.user.prodiId = token.prodiId as string | null
        session.user.name = token.name as string | null
        session.user.email = token.email as string
        session.user.image = token.picture as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})
