
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [Google],
    callbacks: {
        session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
                (session.user as any).credits = (user as any).credits;
            }
            return session;
        }
    }
})
