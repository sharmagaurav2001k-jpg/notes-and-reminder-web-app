import { prisma } from "@/lib/prisma";

/**
 * Extract authenticated user ID from a NextAuth session.
 * Falls back to email-based DB lookup if session.user.id is missing.
 */
export async function getAuthenticatedUserId(session: any): Promise<string | null> {
  if (session?.user?.id) return session.user.id;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { id: true },
    });
    return user?.id || null;
  }
  return null;
}
