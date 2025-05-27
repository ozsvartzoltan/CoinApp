import * as z from "zod"

export const paperMoneySchema = z.object({
  country: z.string().min(1, "Country is required"),
  serial_number: z.string().optional(),
  color: z.string().optional(),
  issue_date: z.string().min(1, "Issue date is required"),
  title: z.string().optional(),
  quality: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  front: z.string().optional(),
  front_description: z.string().optional(),
  back: z.string().optional(),
  back_description: z.string().optional(),
  other: z.string().optional(),
  image: z.string().optional(),
  is_global: z.boolean().optional(),
})
export type PaperMoneyFormValues = z.infer<typeof paperMoneySchema>
