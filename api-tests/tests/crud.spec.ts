import { buildBooking } from "../src/factories/booking.factory.js";
import {
  BookingSchema,
  CreatedBookingSchema,
  CreatedValidBookingSchema,
  ValidBookingSchema,
} from "../src/schemas/api.schemas.js";
import { expect, test } from "../src/fixtures/api.fixture.js";

test.describe("Deterministic booking CRUD lifecycle", () => {
  test("creates a booking with a schema-valid response", async ({
    booker,
    bookings,
  }) => {
    const payload = buildBooking("Create");
    const response = await booker.createBooking(payload);

    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    const created = CreatedBookingSchema.parse(body);
    bookings.track(created.bookingid);
    expect(CreatedValidBookingSchema.parse(body).booking).toEqual(payload);
  });

  test("reads a newly created booking by its returned ID", async ({
    booker,
    bookings,
  }) => {
    const payload = buildBooking("Read");
    const bookingId = await bookings.create(payload);
    const response = await booker.getBooking(bookingId);

    expect(response.status()).toBe(200);
    expect(ValidBookingSchema.parse(await response.json())).toEqual(payload);
  });

  test("fully replaces and persists a booking with PUT", async ({
    booker,
    bookings,
    validToken,
  }) => {
    const bookingId = await bookings.create(buildBooking("PutOriginal"));
    const replacement = buildBooking("PutReplacement", {
      totalprice: 425,
      depositpaid: false,
      bookingdates: { checkin: "2026-10-15", checkout: "2026-10-20" },
      additionalneeds: "Airport transfer",
    });

    const update = await booker.updateBooking(bookingId, replacement, validToken);
    expect(update.status()).toBe(200);
    expect(ValidBookingSchema.parse(await update.json())).toEqual(replacement);

    const lookup = await booker.getBooking(bookingId);
    expect(lookup.status()).toBe(200);
    expect(ValidBookingSchema.parse(await lookup.json())).toEqual(replacement);
  });

  test("partially updates selected fields and preserves omitted fields", async ({
    booker,
    bookings,
    validToken,
  }) => {
    const original = buildBooking("PatchOriginal");
    const bookingId = await bookings.create(original);
    const patch = { totalprice: 260, additionalneeds: "Late checkout" };
    const expected = { ...original, ...patch };

    const update = await booker.partialUpdateBooking(bookingId, patch, validToken);
    expect(update.status()).toBe(200);
    expect(ValidBookingSchema.parse(await update.json())).toEqual(expected);

    const lookup = await booker.getBooking(bookingId);
    expect(lookup.status()).toBe(200);
    expect(ValidBookingSchema.parse(await lookup.json())).toEqual(expected);
  });

  test("deletes a booking and confirms it remains unavailable", async ({
    booker,
    bookings,
    validToken,
  }) => {
    const bookingId = await bookings.create(buildBooking("Delete"));
    const deletion = await booker.deleteBooking(bookingId, validToken);

    expect(deletion.status()).toBe(201);
    bookings.forget(bookingId);
    expect((await booker.getBooking(bookingId)).status()).toBe(404);
  });

  test("completes create, read, PUT, PATCH, and delete in one lifecycle", async ({
    booker,
    bookings,
    validToken,
  }) => {
    const original = buildBooking("Lifecycle");
    const createdResponse = await booker.createBooking(original);
    expect(createdResponse.status()).toBe(200);
    const createdBody: unknown = await createdResponse.json();
    const created = CreatedBookingSchema.parse(createdBody);
    bookings.track(created.bookingid);
    expect(CreatedValidBookingSchema.parse(createdBody).booking).toEqual(original);

    const initialRead = await booker.getBooking(created.bookingid);
    expect(initialRead.status()).toBe(200);
    expect(BookingSchema.parse(await initialRead.json())).toEqual(original);

    const replacement = buildBooking("LifecyclePut", {
      totalprice: 310,
      bookingdates: { checkin: "2026-11-01", checkout: "2026-11-05" },
    });
    const put = await booker.updateBooking(
      created.bookingid,
      replacement,
      validToken,
    );
    expect(put.status()).toBe(200);
    expect(ValidBookingSchema.parse(await put.json())).toEqual(replacement);

    const expectedFinal = { ...replacement, additionalneeds: "Quiet room" };
    const patch = await booker.partialUpdateBooking(
      created.bookingid,
      { additionalneeds: "Quiet room" },
      validToken,
    );
    expect(patch.status()).toBe(200);
    expect(ValidBookingSchema.parse(await patch.json())).toEqual(expectedFinal);
    expect(
      ValidBookingSchema.parse(
        await (await booker.getBooking(created.bookingid)).json(),
      ),
    ).toEqual(expectedFinal);

    expect((await booker.deleteBooking(created.bookingid, validToken)).status()).toBe(
      201,
    );
    bookings.forget(created.bookingid);
    expect((await booker.getBooking(created.bookingid)).status()).toBe(404);
  });

  test("characterizes identical-date bookings as an open inventory question", async ({
    booker,
    bookings,
  }) => {
    const dates = { checkin: "2026-12-10", checkout: "2026-12-12" };
    const first = buildBooking("SameDatesFirst", { bookingdates: dates });
    const second = buildBooking("SameDatesSecond", { bookingdates: dates });
    const firstId = await bookings.create(first);
    const secondId = await bookings.create(second);

    expect(secondId).not.toBe(firstId);
    expect(BookingSchema.parse(await (await booker.getBooking(firstId)).json())).toEqual(
      first,
    );
    expect(
      BookingSchema.parse(await (await booker.getBooking(secondId)).json()),
    ).toEqual(second);
  });
});
