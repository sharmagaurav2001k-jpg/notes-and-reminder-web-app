import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    timezone?: string;
    theme?: string;
  }

  interface Session {
    user: {
      id: string;
      avatarUrl?: string | null;
      timezone?: string;
      theme?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    avatarUrl?: string | null;
    timezone?: string;
    theme?: string;
  }
}
