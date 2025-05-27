"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { paperMoneySchema, PaperMoneyFormValues } from "@/lib/paperMoneySchema"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form"
import { AuthContext } from "@/contexts/authContext"
import { useContext, useState } from "react"
import { createClient } from "@/supabase/supabaseClient"

export default function PaperMoneyForm() {
  const supabase = createClient()
  const { user } = useContext(AuthContext) ?? {}
  const [success, setSuccess] = useState(false)

  const form = useForm<PaperMoneyFormValues>({
    resolver: zodResolver(paperMoneySchema),
    defaultValues: {
      country: "",
      serial_number: "",
      color: "",
      issue_date: "",
      title: "",
      quality: "",
      width: "",
      height: "",
      front: "",
      front_description: "",
      back: "",
      back_description: "",
      other: "",
      image: "",
      is_global: false,
    },
  })

  async function onSubmit(values: PaperMoneyFormValues) {
    setSuccess(false)
    if (!user) {
      alert("You must be logged in!")
      return
    }
    const { error } = await supabase.from("paper_money").insert([
      {
        ...values,
        user_id: user.id,
        width: values.width ? Number(values.width) : null,
        height: values.height ? Number(values.height) : null,
      },
    ])
    if (error) {
      form.setError("country", { message: error.message }) // generic error
    } else {
      setSuccess(true)
      form.reset()
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 bg-white dark:bg-neutral-900 rounded-xl p-6 shadow"
      >
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Input placeholder="Country" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="serial_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serial Number</FormLabel>
              <FormControl>
                <Input placeholder="Serial Number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <Input placeholder="Color" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="issue_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quality</FormLabel>
              <FormControl>
                <Input placeholder="Quality" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="width"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Width (mm)</FormLabel>
                <FormControl>
                  <Input placeholder="Width" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Height (mm)</FormLabel>
                <FormControl>
                  <Input placeholder="Height" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="front"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Front</FormLabel>
              <FormControl>
                <Input placeholder="Front" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="front_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Front Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Front Description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="back"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Back</FormLabel>
              <FormControl>
                <Input placeholder="Back" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="back_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Back Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Back Description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="other"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other</FormLabel>
              <FormControl>
                <Input placeholder="Other" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input placeholder="Image URL" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_global"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mr-2"
                />
              </FormControl>
              <FormLabel className="mb-0">Is Global?</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Adding..." : "Add Paper Money"}
        </Button>
        {success && (
          <div className="text-green-600 text-sm">
            Paper money added successfully!
          </div>
        )}
      </form>
    </Form>
  )
}
