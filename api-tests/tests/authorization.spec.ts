import type { APIResponse } from "@playwright/test";

import { buildBooking } from "../src/factories/booking.factory.js";
import { BookingSchema } from "../src/schemas/api.schemas.js";
import { expect, test } from "../src/fixtures/api.fixture.js";
import type { RestfulBookerClient } from "../src/clients/restful-booker.client.js";

type ProtectedMethod = "PUT" | "PATCH" | "DELETE";

async function callProtectedEndpoint(
  booker: RestfulBookerClient,
  method: ProtectedMethod,
  bookingId: number,
  token: string | undefined,
): Promise<APIResponse> {
  if (method === "PUT") {
    return booker.updateBooking(bookingId, buildBooking("Replacement"), token);
  }
  if (method === "PATCH") {
    return booker.partialUpdateBooking(
      bookingId,
      { additionalneeds: "Authorized phase 2 patch" },
      token,
    );
  }
  return booker.deleteBooking(bookingId, token);
}

test.describe("Protected booking endpoint authorization", () => {
  test("valid token authorizes PUT", async ({ booker, bookings, validToken }) => {
    const bookingId = await bookings.create(buildBooking("PutValid"));
    const replacement = buildBooking("PutReplacement");
    const response = await booker.updateBooking(bookingId, replacement, validToken);

    expect(response.status()).toBe(200);
    expect(BookingSchema.parse(await response.json())).toEqual(replacement);
  });

  test("valid token authorizes PATCH", async ({ booker, bookings, validToken }) => {
    const original = buildBooking("PatchValid");
    const bookingId = await bookings.create(original);
    const response = await booker.partialUpdateBooking(
      bookingId,
      { additionalneeds: "Authorized phase 2 patch" },
      validToken,
    );

    expect(response.status()).toBe(200);
    expect(BookingSchema.parse(await response.json())).toEqual({
      ...original,
      additionalneeds: "Authorized phase 2 patch",
    });
  });

  test("valid token authorizes DELETE", async ({ booker, bookings, validToken }) => {
    const bookingId = await bookings.create(buildBooking("DeleteValid"));
    const response = await booker.deleteBooking(bookingId, validToken);

    expect(response.status()).toBe(201);
    bookings.forget(bookingId);
    expect((await booker.getBooking(bookingId)).status()).toBe(404);
  });

  for (const method of ["PUT", "PATCH", "DELETE"] as const) {
    for (const tokenCase of [
      { name: "missing", article: "a", token: undefined },
      { name: "invalid", article: "an", token: "definitely-invalid-token" },
    ]) {
      test(`${method} rejects ${tokenCase.article} ${tokenCase.name} token without changing data`, async ({
        booker,
        bookings,
      }) => {
        const original = buildBooking(`${method}${tokenCase.name}`);
        const bookingId = await bookings.create(original);
        const response = await callProtectedEndpoint(
          booker,
          method,
          bookingId,
          tokenCase.token,
        );

        expect(response.status()).toBe(403);
        const lookup = await booker.getBooking(bookingId);
        expect(lookup.status()).toBe(200);
        expect(BookingSchema.parse(await lookup.json())).toEqual(original);
      });
    }
  }

  test("fabricated stale token is rejected", async ({ booker, bookings }) => {
    const original = buildBooking("StaleToken");
    const bookingId = await bookings.create(original);
    const response = await booker.partialUpdateBooking(
      bookingId,
      { additionalneeds: "Unauthorized stale-token patch" },
      "expired-or-revoked-token",
    );

    expect(response.status()).toBe(403);
    const lookup = await booker.getBooking(bookingId);
    expect(BookingSchema.parse(await lookup.json())).toEqual(original);
  });
});
