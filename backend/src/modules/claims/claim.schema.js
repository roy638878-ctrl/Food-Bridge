import { z } from "zod";

export const createClaimSchema = z.object({
  listing_id: z.coerce.number().int().positive("Valid listing ID is required"),
  claimed_quantity: z.coerce.number().int().positive("Claimed quantity must be positive"),
  fulfillment_type: z.enum(["pickup", "delivery"]).default("pickup"),
  notes: z.string().trim().max(500).optional(),
});

export const decideClaimSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

export const verifyHandoverSchema = z.object({
  otp: z.string().trim().length(6, "6-digit handover OTP is required"),
});

export const reportUnsafeSchema = z.object({
  reason: z.string().trim().min(5, "Please describe the food safety issue"),
});
