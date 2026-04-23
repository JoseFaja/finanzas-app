import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

type GoogleProfile = {
  sub?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

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
      const p = profile as GoogleProfile | undefined;

      if (!user.email || !p?.sub) {
        return false;
      }

      const nombre =
        p.given_name ?? user.name?.split(" ")[0] ?? null;
      const apellido =
        p.family_name ?? (user.name?.split(" ").slice(1).join(" ") || null);

      await prisma.usuario.upsert({
        where: { correo: user.email },
        update: {
          googleSub: p.sub,
          nombre,
          apellido,
          googleImage: p.picture ?? user.image ?? null,
          emailVerificado: p.email_verified ?? null,
          proveedor: "google",
          ultimoLogin: new Date(),
        },
        create: {
          correo: user.email,
          googleSub: p.sub,
          nombre,
          apellido,
          googleImage: p.picture ?? user.image ?? null,
          emailVerificado: p.email_verified ?? null,
          proveedor: "google",
          ultimoLogin: new Date(),
        },
      });

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