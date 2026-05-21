import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const { email, password } = credentials as {
          email: string
          password: string
        }

        const user = await prisma.user.findUnique({ where: { email } })
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
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.prodiId = user.prodiId
      }
      return token
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as any
        session.user.prodiId = token.prodiId as string | null
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
