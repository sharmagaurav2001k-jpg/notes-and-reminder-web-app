import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both email and password");
        }

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error("Invalid email or password format");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.passwordHash) {
          throw new Error("No user found with this email");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Incorrect password");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          timezone: user.timezone,
          theme: user.theme,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.avatarUrl = user.avatarUrl;
        token.timezone = user.timezone;
        token.theme = user.theme;
      }

      // Handle session updates (e.g. updating profile or theme)
      if (trigger === "update" && session) {
        if (session.name !== undefined) token.name = session.name;
        if (session.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl;
        if (session.timezone !== undefined) token.timezone = session.timezone;
        if (session.theme !== undefined) token.theme = session.theme;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.avatarUrl = token.avatarUrl as string | null;
        session.user.timezone = token.timezone as string;
        session.user.theme = token.theme as string;
      }
      return session;
    },
  },
};
