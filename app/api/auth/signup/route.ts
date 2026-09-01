import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  timezone: z.string().optional().default("UTC"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message || "Invalid input data";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { name, email, password, timezone } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        timezone: timezone || "UTC",
        theme: "system",
      },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
        theme: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: "Account created successfully", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong while creating your account" },
      { status: 500 }
    );
  }
}
