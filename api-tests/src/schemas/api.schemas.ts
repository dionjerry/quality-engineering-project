import { z } from "zod";

export const AuthSuccessSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{15}$/),
});

export const AuthErrorSchema = z.object({
  reason: z.string(),
});

export const BookingSchema = z.object({
  firstname: z.string(),
  lastname: z.string(),
  totalprice: z.number(),
  depositpaid: z.boolean(),
  bookingdates: z.object({
    checkin: z.string(),
    checkout: z.string(),
  }),
  additionalneeds: z.string(),
});

export const CreatedBookingSchema = z.object({
  bookingid: z.number().int().positive(),
  booking: BookingSchema,
});

export type AuthCredentials = Partial<{
  username: string;
  password: string;
}>;
export type Booking = z.infer<typeof BookingSchema>;
export type BookingPatch = Partial<Booking>;

