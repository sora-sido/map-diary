import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile?.email) {
        const dbUser = await prisma.user.upsert({
          where: { googleId: account.providerAccountId },
          create: {
            googleId: account.providerAccountId,
            email: profile.email,
            name: profile.name,
            avatarUrl: (profile as { picture?: string }).picture,
            googleRefreshToken: account.refresh_token,
          },
          update: {
            email: profile.email,
            name: profile.name,
            avatarUrl: (profile as { picture?: string }).picture,
            ...(account.refresh_token
              ? { googleRefreshToken: account.refresh_token }
              : {}),
          },
        });
        token.userId = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
};
