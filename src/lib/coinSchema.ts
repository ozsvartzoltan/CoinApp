import * as z from "zod"

export const coinSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  mint: z.string().optional(),
  issue_date: z.string().min(1, "Issue date is required"),
  weight: z.string().optional(),
  width: z.string().optional(),
  front: z.string().optional(),
  front_description: z.string().optional(),
  back: z.string().optional(),
  back_description: z.string().optional(),
  other: z.string().optional(),
  image: z.string().optional(),
  is_global: z.boolean().optional(),
})
export type CoinFormValues = z.infer<typeof coinSchema>
