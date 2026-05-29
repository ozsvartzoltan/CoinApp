import * as z from "zod"

export const coinSchema = z.object({
  origin: z.string().min(1, "Origin is required"), //origin
  mint: z.string().optional(), //verde
  issue_date: z.string().min(1, "Issue date is required"), //missing
  weight: z.string().optional(), //missing
  width: z.string().optional(), //missing
  front: z.string().optional(), //missing
  front_description: z.string().optional(),
  back: z.string().optional(),
  back_description: z.string().optional(),
  other: z.string().optional(),
  image: z.string().optional(),
  is_global: z.boolean().optional(),
})
export type CoinFormValues = z.infer<typeof coinSchema>
// i would add the following fields to the coinSchema:
// denomination --> címlet
// prep_method --> készítési mód
// material --> anyag
// authority --> hatóság
// deity --> istenség
// dynasty --> dinasztia
// issuer --> kibocsátó
// condition --> állapot
// symbol --> szimbólum
// change origin and issue_date to optional
// change issue_date to time_interval
// remove is_global

/*
origin-string
mint-string
time_interval-object
weight-string
width-string
front-object
back-object
other-object
image-string
denomination-string
prep_method-string
material-string
authority-string
deity-string
dynasty-string
issuer-string
condition-string
symbol-string
*/
