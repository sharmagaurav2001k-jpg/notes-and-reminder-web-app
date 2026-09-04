import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * Find or create a user from an OAuth provider (Google/GitHub).
 * If the user's email already exists, return that user.
 * If not, create a new user with a random password hash.
 */
async function findOrCreateOAuthUser(
  email: string,
  name: string,
  avatarUrl: string | null,
): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) return existing.id;

  // Create new user with random password (they'll use OAuth to log in)
  const randomPassword = randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(randomPassword, 12);

  const newUser = await prisma.user.create({
    data: { email: normalizedEmail, name, avatarUrl, passwordHash },
    select: { id: true },
  });

  return newUser.id;
}

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
    // Existing credentials provider (email/password)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: ".password", type: "password" },
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

    // Google OAuth — enabled when GOOGLE_CLIENT_ID & SECRET are set
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            async profile(profile) {
              const userId = await findOrCreateOAuthUser(
                profile.email!,
                profile.name ?? profile.email!.split("@")[0],
                profile.picture ?? null,
              );
              return {
                id: userId,
                name: profile.name ?? profile.email!.split("@")[0],
                email: profile.email!,
                avatarUrl: profile.picture ?? null,
                timezone: "UTC",
                theme: "system",
              };
            },
          }),
        ]
      : []),

    // GitHub OAuth — enabled when GITHUB_CLIENT_ID & SECRET are set
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            async profile(profile) {
              const userId = await findOrCreateOAuthUser(
                profile.email!,
                profile.name ?? profile.login,
                profile.avatar_url ?? null,
              );
              return {
                id: userId,
                name: profile.name ?? profile.login,
                email: profile.email!,
                avatarUrl: profile.avatar_url ?? null,
                timezone: "UTC",
                theme: "system",
              };
            },
          }),
        ]
      : []),
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
