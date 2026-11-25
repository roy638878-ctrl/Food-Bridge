import { z } from "zod";

export const createListingSchema = z.object({
  category_id: z.coerce.number().int().positive("Valid category is required"),
  title: z.string().trim().min(3, "Food title must be at least 3 characters").max(150),
  description: z.string().trim().max(1000).optional(),
  food_type: z.enum(["veg", "non_veg", "vegan"]),
  total_quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  unit: z.enum(["servings", "kg", "packets", "boxes"]),
  storage_type: z.enum(["ambient", "refrigerated", "frozen", "hot_held"]),
  allergen_info: z.string().trim().max(200).optional(),
  safety_checklist_passed: z.preprocess(
    (val) => val === true || val === "true" || val === "1" || val === 1,
    z.boolean()
  ),
  prepared_at: z.string().min(1, "Prepared time is required"),
  expiry_at: z.string().min(1, "Expiry time is required"),
  pickup_address: z.string().trim().min(4, "Pickup address is required"),
  city: z.string().trim().min(2, "City is required"),
});
