import { z } from "zod";

export const assignmentFormSchema = z.object({
  address: z.string().min(2, "Adress krävs"),
  city: z.string().min(1, "Stad krävs"),
  postal_code: z
    .string()
    .regex(/^\d{3}\s?\d{2}$/, "Ange ett giltigt postnummer (5 siffror)")
    .optional()
    .or(z.literal("")),
  property_type: z.enum(
    ["bostadsratt", "villa", "radhus", "fritidshus", "tomt", "ovrigt"],
    { message: "Välj bostadstyp" },
  ),
  rooms: z.coerce.number().min(1).max(30).optional().or(z.literal("")),
  living_area_sqm: z.coerce
    .number()
    .min(1)
    .max(2000)
    .optional()
    .or(z.literal("")),
  floor: z.coerce.number().min(-2).max(50).optional().or(z.literal("")),
  build_year: z.coerce
    .number()
    .min(1600)
    .max(new Date().getFullYear() + 5)
    .optional()
    .or(z.literal("")),
  monthly_fee: z.coerce.number().min(0).optional().or(z.literal("")),
  asking_price: z.coerce.number().min(0).optional().or(z.literal("")),
  seller_name: z.string().optional().or(z.literal("")),
  seller_email: z
    .string()
    .email("Ange en giltig e-postadress")
    .optional()
    .or(z.literal("")),
  seller_phone: z.string().optional().or(z.literal("")),
  association_name: z.string().optional().or(z.literal("")),
  association_org_number: z.string().optional().or(z.literal("")),
});

export type AssignmentFormData = z.infer<typeof assignmentFormSchema>;
