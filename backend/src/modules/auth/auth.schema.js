import { z } from "zod";

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required"),
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  phone: z.string().trim().min(7, "Valid phone number is required").max(20),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["donor", "ngo", "receiver"]),
  address: z.string().trim().min(4, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  donor_type: z
    .enum(["individual", "restaurant", "college_mess", "marriage_hall", "caterer"])
    .optional(),
  organization_name: z.string().trim().optional(),
  ngo_name: z.string().trim().optional(),
  registration_number: z.string().trim().optional(),
  service_area: z.string().trim().optional(),
  daily_capacity_servings: z.coerce.number().int().positive().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});
