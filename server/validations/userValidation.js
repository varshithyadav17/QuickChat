import { z } from "zod"

export const signupSchema = z.object({
    fullName: z
        .string()
        .trim()
        .min(3, "Full name must contain at least 3 characters"),

    email: z
        .email("Invalid email address")
        .toLowerCase(),

    password: z
        .string()
        .min(6, "Password must contain at least 6 characters"),

    bio: z
        .string()
        .trim()
        .min(1, "Bio is required")
})

export const loginSchema = z.object({
    email: z
        .email("Invalid email address")
        .toLowerCase(),

    password: z
        .string()
        .min(6, "Incorrect password or email")
})