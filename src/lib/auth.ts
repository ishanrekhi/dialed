import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google, // reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
    Resend({
      // reads AUTH_RESEND_KEY; resend.dev sender works without domain
      // verification (delivers only to the Resend account owner's inbox —
      // swap for a verified domain before inviting others via magic link)
      from: "Dialed <onboarding@resend.dev>",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});

// Session-derived user id for pages and server actions. Never accept a
// userId from the client — always resolve it here.
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}
