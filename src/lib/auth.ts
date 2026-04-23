import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.email || !profile?.sub) {
        return false;
      }

      const existing = await prisma.usuario.findUnique({
        where: { correo: user.email },
      });

      if (!existing) {
        await prisma.usuario.create({
          data: {
            correo: user.email,
            nombre: user.name?.split(" ")[0] ?? null,
            apellido: user.name?.split(" ").slice(1).join(" ") || null,
            googleSub: profile.sub,
          },
        });
      } else if (existing.googleSub !== profile.sub) {
        await prisma.usuario.update({
          where: { id: existing.id },
          data: { googleSub: profile.sub },
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;

      if (email) {
        const dbUser = await prisma.usuario.findUnique({
          where: { correo: email },
          select: { id: true },
        });

        token.userId = dbUser?.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = Number(token.userId);
      }

      return session;
    },
  },
};
