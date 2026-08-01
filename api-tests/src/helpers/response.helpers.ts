import type { APIResponse } from "@playwright/test";

import type { RestfulBookerClient } from "../clients/restful-booker.client.js";
import type { BookingTracker } from "./booking-tracker.js";
import {
  BookingIdListSchema,
  BookingIdSchema,
  BookingSchema,
  type Booking,
} from "../schemas/api.schemas.js";

export async function parseAndTrackCreatedBooking(
  response: APIResponse,
  bookings: BookingTracker,
): Promise<unknown> {
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Plain-text errors are valid evidence for negative tests.
  }
  if (response.status() === 200) {
    const created = BookingIdSchema.parse(body);
    bookings.track(created.bookingid);
  }
  return body;
}

export async function parseBookingIds(response: APIResponse): Promise<number[]> {
  return BookingIdListSchema.parse(await response.json()).map(
    ({ bookingid }) => bookingid,
  );
}

export async function hydrateBookings(
  booker: RestfulBookerClient,
  bookingIds: number[],
): Promise<Map<number, Booking>> {
  const bookings = new Map<number, Booking>();
  for (const bookingId of bookingIds) {
    const response = await booker.getBooking(bookingId);
    if (response.status() !== 200) {
      throw new Error(`GET /booking/${bookingId} returned ${response.status()}`);
    }
    bookings.set(bookingId, BookingSchema.parse(await response.json()));
  }
  return bookings;
}
