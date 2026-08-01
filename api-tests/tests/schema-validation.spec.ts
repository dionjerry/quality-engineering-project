import type { APIResponse } from "@playwright/test";

import type { RestfulBookerClient } from "../src/clients/restful-booker.client.js";
import { buildBooking } from "../src/factories/booking.factory.js";
import type { BookingTracker } from "../src/helpers/booking-tracker.js";
import {
  BookingSchema,
  CreatedBookingSchema,
  type ValidBooking,
} from "../src/schemas/api.schemas.js";
import { expect, test } from "../src/fixtures/api.fixture.js";

type MutationMethod = "POST" | "PUT" | "PATCH";

async function trackUnexpectedCreation(
  response: APIResponse,
  bookings: BookingTracker,
): Promise<void> {
  if (response.status() === 200) {
    const created = CreatedBookingSchema.parse(await response.json());
    bookings.track(created.bookingid);
  }
}

async function submitInvalidMutation(options: {
  booker: RestfulBookerClient;
  bookings: BookingTracker;
  validToken: string;
  method: MutationMethod;
  payload: unknown;
}): Promise<APIResponse> {
  const { booker, bookings, validToken, method, payload } = options;
  if (method === "POST") {
    const response = await booker.createBookingPayload(payload);
    await trackUnexpectedCreation(response, bookings);
    return response;
  }

  const original = buildBooking(`${method}Validation`);
  const bookingId = await bookings.create(original);
  const response =
    method === "PUT"
      ? await booker.updateBookingPayload(bookingId, payload, validToken)
      : await booker.partialUpdateBookingPayload(bookingId, payload, validToken);
  const lookup = await booker.getBooking(bookingId);

  expect(lookup.status()).toBe(200);
  expect(BookingSchema.parse(await lookup.json())).toEqual(original);
  return response;
}

function withoutField(
  booking: ValidBooking,
  field: keyof ValidBooking,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(booking).filter(([key]) => key !== field),
  );
}

test.describe("Booking request schema and business-rule validation", () => {
  for (const method of ["POST", "PUT", "PATCH"] as const) {
    test(`${method} rejects a negative totalprice`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      test.fail(
        true,
        "BUG-API-005: negative prices are accepted; see reports/phase-3-crud-report.md",
      );
      const base = buildBooking(`${method}NegativePrice`);
      const payload = method === "PATCH" ? { totalprice: -1 } : { ...base, totalprice: -1 };
      const response = await submitInvalidMutation({
        booker,
        bookings,
        validToken,
        method,
        payload,
      });

      expect(response.status()).toBe(400);
    });

    test(`${method} rejects blank customer names`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      test.fail(
        true,
        "BUG-API-006: blank names are accepted; see reports/phase-3-crud-report.md",
      );
      const base = buildBooking(`${method}BlankNames`);
      const payload =
        method === "PATCH"
          ? { firstname: "", lastname: "" }
          : { ...base, firstname: "", lastname: "" };
      const response = await submitInvalidMutation({
        booker,
        bookings,
        validToken,
        method,
        payload,
      });

      expect(response.status()).toBe(400);
    });

    test(`${method} rejects a string depositpaid value`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      test.fail(
        true,
        "BUG-API-008: string deposit status is coerced; see reports/phase-3-crud-report.md",
      );
      const base = buildBooking(`${method}WrongBoolean`);
      const payload =
        method === "PATCH" ? { depositpaid: "ddd" } : { ...base, depositpaid: "ddd" };
      const response = await submitInvalidMutation({
        booker,
        bookings,
        validToken,
        method,
        payload,
      });

      expect(response.status()).toBe(400);
    });

    test(`${method} rejects checkout before checkin`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      test.fail(
        true,
        "BUG-API-009: reversed date ranges are accepted; see reports/phase-3-crud-report.md",
      );
      const reversedDates = { checkin: "2026-11-20", checkout: "2026-11-10" };
      const base = buildBooking(`${method}ReverseDates`);
      const payload =
        method === "PATCH"
          ? { bookingdates: reversedDates }
          : { ...base, bookingdates: reversedDates };
      const response = await submitInvalidMutation({
        booker,
        bookings,
        validToken,
        method,
        payload,
      });

      expect(response.status()).toBe(400);
    });
  }

  for (const field of [
    "firstname",
    "lastname",
    "totalprice",
    "depositpaid",
    "bookingdates",
  ] as const) {
    test(`POST reports the missing ${field} field without a server error`, async ({
      booker,
    }) => {
      test.fail(
        true,
        "BUG-API-007: missing required fields return 500; see reports/phase-3-crud-report.md",
      );
      const response = await booker.createBookingPayload(
        withoutField(buildBooking(`Missing${field}`), field),
      );
      const body = (await response.text()).toLowerCase();

      expect(response.status()).toBe(400);
      expect(body).toContain(field);
    });
  }

  for (const method of ["PUT", "PATCH", "DELETE"] as const) {
    test(`${method} returns 404 for a booking that was deleted`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      test.fail(
        true,
        "BUG-API-010: nonexistent resources return 405; see reports/phase-3-crud-report.md",
      );
      const bookingId = await bookings.create(buildBooking(`${method}NotFound`));
      expect((await booker.deleteBooking(bookingId, validToken)).status()).toBe(201);
      bookings.forget(bookingId);
      expect((await booker.getBooking(bookingId)).status()).toBe(404);

      const response =
        method === "PUT"
          ? await booker.updateBooking(bookingId, buildBooking("NotFoundPut"), validToken)
          : method === "PATCH"
            ? await booker.partialUpdateBooking(
                bookingId,
                { additionalneeds: "Unavailable" },
                validToken,
              )
            : await booker.deleteBooking(bookingId, validToken);

      expect(response.status()).toBe(404);
    });
  }

  test("malformed JSON receives 400 rather than creating a booking", async ({
    booker,
  }) => {
    const response = await booker.createBookingRaw(
      '{"firstname":"Jim","depositpaid":ddd}',
    );

    expect(response.status()).toBe(400);
    expect(await response.text()).toBe("Bad Request");
  });
});
