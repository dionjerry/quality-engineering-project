import { z } from "zod";

export const AuthSuccessSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{15}$/),
});

export const AuthErrorSchema = z.object({
  reason: z.string(),
});

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const BookingSchema = z.object({
  firstname: z.string(),
  lastname: z.string(),
  totalprice: z.number(),
  depositpaid: z.boolean(),
  bookingdates: z.object({
    checkin: IsoDateSchema,
    checkout: IsoDateSchema,
  }),
  additionalneeds: z.string().optional(),
});

export const ValidBookingSchema = BookingSchema.extend({
  firstname: z.string().trim().min(1),
  lastname: z.string().trim().min(1),
  totalprice: z.number().nonnegative(),
}).superRefine((booking, context) => {
  if (booking.bookingdates.checkout <= booking.bookingdates.checkin) {
    context.addIssue({
      code: "custom",
      message: "checkout must be later than checkin",
      path: ["bookingdates", "checkout"],
    });
  }
});

export const CreatedBookingSchema = z.object({
  bookingid: z.number().int().positive(),
  booking: BookingSchema,
});

export const CreatedValidBookingSchema = z.object({
  bookingid: z.number().int().positive(),
  booking: ValidBookingSchema,
});

export type AuthCredentials = Partial<{
  username: string;
  password: string;
}>;
export type Booking = z.infer<typeof BookingSchema>;
export type ValidBooking = z.infer<typeof ValidBookingSchema>;
export type BookingPatch = Partial<Booking>;
