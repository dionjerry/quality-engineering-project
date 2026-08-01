import type { APIResponse } from "@playwright/test";

import type { RestfulBookerClient } from "../src/clients/restful-booker.client.js";
import { buildBooking } from "../src/factories/booking.factory.js";
import type { BookingTracker } from "../src/helpers/booking-tracker.js";
import { parseAndTrackCreatedBooking } from "../src/helpers/response.helpers.js";
import {
  BookingSchema,
  type Booking,
  type ValidBooking,
} from "../src/schemas/api.schemas.js";
import { expect, test } from "../src/fixtures/api.fixture.js";

type MutationMethod = "POST" | "PUT" | "PATCH";

interface MutationResult {
  response: APIResponse;
  body?: unknown;
  bookingId?: number;
  original?: ValidBooking;
  persisted?: Booking;
}

function bookingIdFrom(body: unknown): number | undefined {
  if (typeof body !== "object" || body === null || !("bookingid" in body)) return;
  return typeof body.bookingid === "number" ? body.bookingid : undefined;
}

async function submitMutation(options: {
  booker: RestfulBookerClient;
  bookings: BookingTracker;
  validToken: string;
  method: MutationMethod;
  payload: unknown;
}): Promise<MutationResult> {
  const { booker, bookings, validToken, method, payload } = options;
  if (method === "POST") {
    const response = await booker.createBookingPayload(payload);
    const body = await parseAndTrackCreatedBooking(response, bookings);
    const bookingId = bookingIdFrom(body);
    return bookingId === undefined
      ? { response, body }
      : { response, body, bookingId };
  }

  const original = buildBooking(`${method}NegativeBoundary`);
  const bookingId = await bookings.create(original);
  const requestPayload = method === "PUT" ? { ...original, ...(payload as object) } : payload;
  const response =
    method === "PUT"
      ? await booker.updateBookingPayload(bookingId, requestPayload, validToken)
      : await booker.partialUpdateBookingPayload(bookingId, requestPayload, validToken);
  const lookup = await booker.getBooking(bookingId);
  expect(lookup.status()).toBe(200);
  const persisted = BookingSchema.parse(await lookup.json());
  return { response, bookingId, original, persisted };
}

async function expectRejectedMutation(options: {
  booker: RestfulBookerClient;
  bookings: BookingTracker;
  validToken: string;
  method: MutationMethod;
  payload: unknown;
}): Promise<void> {
  const result = await submitMutation(options);
  if (result.original !== undefined) expect(result.persisted).toEqual(result.original);
  expect(result.response.status()).toBe(400);
}

test.describe("Booking negative and boundary validation", () => {
  for (const testCase of [
    { method: "POST" as const, name: "numeric firstname", payload: { firstname: 123 } },
    { method: "PUT" as const, name: "numeric firstname", payload: { firstname: 123 } },
    { method: "PATCH" as const, name: "numeric firstname", payload: { firstname: 123 } },
    { method: "POST" as const, name: "boolean lastname", payload: { lastname: false } },
    { method: "POST" as const, name: "string bookingdates", payload: { bookingdates: "2031-04-10" } },
    { method: "PATCH" as const, name: "numeric additionalneeds", payload: { additionalneeds: 123 } },
    {
      method: "PATCH" as const,
      name: "numeric checkin",
      payload: { bookingdates: { checkin: 123, checkout: "2031-04-20" } },
    },
  ]) {
    test(`${testCase.method} rejects ${testCase.name}`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      test.fail(
        true,
        "BUG-API-011: field types are inconsistently validated; see ../../docs/Part-2/Bug-Report.pdf",
      );
      const base = buildBooking(`WrongType${testCase.method}`);
      const payload =
        testCase.method === "POST" ? { ...base, ...testCase.payload } : testCase.payload;
      await expectRejectedMutation({
        booker,
        bookings,
        validToken,
        method: testCase.method,
        payload,
      });
    });
  }

  test("POST preserves decimal price precision", async ({
    booker,
    bookings,
    validToken,
  }) => {
    test.fail(
      true,
      "BUG-API-012: decimal prices are truncated; see ../../docs/Part-2/Bug-Report.pdf",
    );
    const payload = buildBooking("DecimalPrice", { totalprice: 99.95 });
    const result = await submitMutation({
      booker,
      bookings,
      validToken,
      method: "POST",
      payload,
    });
    expect(result.response.status()).toBe(200);
    expect(result.bookingId).toBeDefined();
    const lookup = await booker.getBooking(result.bookingId!);
    expect(BookingSchema.parse(await lookup.json()).totalprice).toBe(99.95);
  });

  for (const testCase of [
    { method: "POST" as const, value: "111", name: "numeric string" },
    { method: "PUT" as const, value: "eleven", name: "non-numeric string" },
    { method: "PATCH" as const, value: "111", name: "numeric string" },
  ]) {
    test(`${testCase.method} rejects a ${testCase.name} totalprice`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      test.fail(
        true,
        "BUG-API-012: prices are silently coerced; see ../../docs/Part-2/Bug-Report.pdf",
      );
      const base = buildBooking(`PriceCoercion${testCase.method}`);
      const invalid = { totalprice: testCase.value };
      await expectRejectedMutation({
        booker,
        bookings,
        validToken,
        method: testCase.method,
        payload: testCase.method === "POST" ? { ...base, ...invalid } : invalid,
      });
    });
  }

  for (const method of ["POST", "PUT", "PATCH"] as const) {
    test(`${method} rejects impossible calendar dates`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      test.fail(
        true,
        "BUG-API-013: impossible dates are normalized; see ../../docs/Part-2/Bug-Report.pdf",
      );
      const invalidDates = { checkin: "2031-02-30", checkout: "2031-02-31" };
      const base = buildBooking(`ImpossibleDates${method}`);
      await expectRejectedMutation({
        booker,
        bookings,
        validToken,
        method,
        payload:
          method === "POST"
            ? { ...base, bookingdates: invalidDates }
            : { bookingdates: invalidDates },
      });
    });
  }

  for (const testCase of [
    { name: "zero-byte", raw: true, payload: "" },
    { name: "JSON array", raw: false, payload: [] },
  ]) {
    test(`POST rejects a ${testCase.name} body without a server error`, async ({
      booker,
    }) => {
      test.fail(
        true,
        "BUG-API-014: invalid body shapes return 500; see ../../docs/Part-2/Bug-Report.pdf",
      );
      const response = testCase.raw
        ? await booker.createBookingRaw(testCase.payload as string)
        : await booker.createBookingPayload(testCase.payload);
      expect(response.status()).toBe(400);
    });
  }

  for (const method of ["POST", "PUT", "PATCH"] as const) {
    test(`${method} rejects whitespace-only customer names`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      test.fail(
        true,
        "BUG-API-006: whitespace names become blank; see ../../docs/Part-2/Bug-Report.pdf",
      );
      const base = buildBooking(`Whitespace${method}`);
      const invalid = { firstname: "   ", lastname: "\t" };
      await expectRejectedMutation({
        booker,
        bookings,
        validToken,
        method,
        payload: method === "POST" ? { ...base, ...invalid } : invalid,
      });
    });

    test(`${method} rejects string false for depositpaid`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      test.fail(
        true,
        "BUG-API-008: string false is coerced to true; see ../../docs/Part-2/Bug-Report.pdf",
      );
      const base = buildBooking(`StringFalse${method}`);
      const invalid = { depositpaid: "false" };
      await expectRejectedMutation({
        booker,
        bookings,
        validToken,
        method,
        payload: method === "POST" ? { ...base, ...invalid } : invalid,
      });
    });

    test(`${method} rejects checkout equal to checkin`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      test.fail(
        true,
        "BUG-API-009: zero-night stays are accepted; see ../../docs/Part-2/Bug-Report.pdf",
      );
      const equalDates = { checkin: "2031-04-10", checkout: "2031-04-10" };
      const base = buildBooking(`EqualDates${method}`);
      await expectRejectedMutation({
        booker,
        bookings,
        validToken,
        method,
        payload:
          method === "POST"
            ? { ...base, bookingdates: equalDates }
            : { bookingdates: equalDates },
      });
    });
  }

  for (const testCase of [
    { name: "zero", value: 0 },
    { name: "maximum safe integer", value: Number.MAX_SAFE_INTEGER },
  ]) {
    test(`POST preserves the ${testCase.name} price boundary`, async ({
      booker,
      bookings,
    }) => {
      const payload = buildBooking(`Price${testCase.name}`, {
        totalprice: testCase.value,
      });
      const response = await booker.createBooking(payload);
      expect(response.status()).toBe(200);
      const body = await parseAndTrackCreatedBooking(response, bookings);
      const bookingId = bookingIdFrom(body);
      expect(bookingId).toBeDefined();
      const persisted = BookingSchema.parse(
        await (await booker.getBooking(bookingId!)).json(),
      );
      expect(persisted.totalprice).toBe(testCase.value);
    });
  }

  test("POST characterizes an extremely long customer name", async ({
    booker,
    bookings,
  }) => {
    const longName = "A".repeat(5_000);
    const response = await booker.createBooking(
      buildBooking("LongName", { firstname: longName }),
    );
    expect(response.status()).toBe(200);
    const body = await parseAndTrackCreatedBooking(response, bookings);
    const bookingId = bookingIdFrom(body);
    const persisted = BookingSchema.parse(
      await (await booker.getBooking(bookingId!)).json(),
    );
    expect(persisted.firstname).toHaveLength(5_000);
  });

  test("POST JSON null receives 400", async ({ booker }) => {
    expect((await booker.createBookingPayload(null)).status()).toBe(400);
  });

  test("POST malformed JSON receives 400", async ({ booker }) => {
    expect((await booker.createBookingRaw('{"firstname":')).status()).toBe(400);
  });

  test("unknown fields are ignored rather than persisted", async ({
    booker,
    bookings,
  }) => {
    const payload = { ...buildBooking("UnknownField"), unexpectedField: "ignored" };
    const response = await booker.createBookingPayload(payload);
    const body = await parseAndTrackCreatedBooking(response, bookings);
    expect(response.status()).toBe(200);
    expect(JSON.stringify(body)).not.toContain("unexpectedField");
  });

  for (const testCase of [
    { name: "SQL-like", firstname: "' OR 1=1 --", additionalneeds: "DROP TABLE bookings;" },
    { name: "HTML-like", firstname: "<script>alert(1)</script>", additionalneeds: "<img src=x onerror=alert(1)>" },
    { name: "path and control", firstname: "../booking/1", additionalneeds: "Line\\nBreak" },
  ]) {
    test(`${testCase.name} strings remain ordinary booking data`, async ({
      booker,
      bookings,
    }) => {
      const controlId = await bookings.create(buildBooking(`${testCase.name}Control`));
      const payload = buildBooking(`${testCase.name}Payload`, {
        firstname: testCase.firstname,
        additionalneeds: testCase.additionalneeds,
      });
      const bookingId = await bookings.create(payload);

      expect(
        BookingSchema.parse(await (await booker.getBooking(bookingId)).json()),
      ).toEqual(payload);
      expect((await booker.getBooking(controlId)).status()).toBe(200);
    });
  }

  for (const testCase of [
    { name: "zero-byte", kind: "raw", payload: "" },
    { name: "JSON null", kind: "payload", payload: null },
    { name: "JSON array", kind: "payload", payload: [] },
    { name: "malformed JSON", kind: "raw", payload: '{"firstname":' },
  ] as const) {
    test(`PUT ${testCase.name} body returns 400 and preserves the booking`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      const original = buildBooking(`PutBody${testCase.name}`);
      const bookingId = await bookings.create(original);
      const response =
        testCase.kind === "raw"
          ? await booker.updateBookingRaw(bookingId, testCase.payload as string, validToken)
          : await booker.updateBookingPayload(bookingId, testCase.payload, validToken);
      expect(response.status()).toBe(400);
      expect(
        BookingSchema.parse(await (await booker.getBooking(bookingId)).json()),
      ).toEqual(original);
    });
  }

  for (const testCase of [
    { name: "zero-byte", kind: "raw", payload: "" },
    { name: "JSON array", kind: "payload", payload: [] },
  ] as const) {
    test(`PATCH ${testCase.name} body is characterized as a no-op`, async ({
      booker,
      bookings,
      validToken,
    }) => {
      const original = buildBooking(`PatchBody${testCase.name}`);
      const bookingId = await bookings.create(original);
      const response =
        testCase.kind === "raw"
          ? await booker.partialUpdateBookingRaw(
              bookingId,
              testCase.payload as string,
              validToken,
            )
          : await booker.partialUpdateBookingPayload(
              bookingId,
              testCase.payload,
              validToken,
            );
      expect(response.status()).toBe(200);
      expect(
        BookingSchema.parse(await (await booker.getBooking(bookingId)).json()),
      ).toEqual(original);
    });
  }
});
