import type { APIResponse } from "@playwright/test";

import type { RestfulBookerClient } from "../src/clients/restful-booker.client.js";
import { buildBooking } from "../src/factories/booking.factory.js";
import {
  hydrateBookings,
  parseBookingIds,
} from "../src/helpers/response.helpers.js";
import type { Booking } from "../src/schemas/api.schemas.js";
import { expect, test } from "../src/fixtures/api.fixture.js";

async function parseAndHydrate(
  booker: RestfulBookerClient,
  response: APIResponse,
): Promise<{ ids: number[]; bookings: Map<number, Booking> }> {
  expect(response.status()).toBe(200);
  const ids = await parseBookingIds(response);
  return { ids, bookings: await hydrateBookings(booker, ids) };
}

test.describe("GET /booking filtering correctness", () => {
  test("filters by exact firstname, lastname, and their combination", async ({
    booker,
    bookings,
  }) => {
    const firstName = buildBooking("FilterFirst").firstname;
    const firstLast = buildBooking("FilterLastA").lastname;
    const secondLast = buildBooking("FilterLastB").lastname;
    const firstId = await bookings.create(
      buildBooking("FilterOne", { firstname: firstName, lastname: firstLast }),
    );
    const secondId = await bookings.create(
      buildBooking("FilterTwo", { firstname: firstName, lastname: secondLast }),
    );
    const thirdId = await bookings.create(
      buildBooking("FilterThree", { lastname: firstLast }),
    );

    const byFirst = await parseAndHydrate(
      booker,
      await booker.getBookingIds({ firstname: firstName }),
    );
    expect(new Set(byFirst.ids)).toEqual(new Set([firstId, secondId]));
    for (const booking of byFirst.bookings.values()) {
      expect(booking.firstname).toBe(firstName);
    }

    const byLast = await parseAndHydrate(
      booker,
      await booker.getBookingIds({ lastname: firstLast }),
    );
    expect(new Set(byLast.ids)).toEqual(new Set([firstId, thirdId]));
    for (const booking of byLast.bookings.values()) {
      expect(booking.lastname).toBe(firstLast);
    }

    const combined = await parseAndHydrate(
      booker,
      await booker.getBookingIds({ firstname: firstName, lastname: firstLast }),
    );
    expect(combined.ids).toEqual([firstId]);
    expect(combined.bookings.get(firstId)).toMatchObject({
      firstname: firstName,
      lastname: firstLast,
    });
  });

  test("returns an empty list when no name matches", async ({ booker }) => {
    const response = await booker.getBookingIds({
      firstname: buildBooking("NoMatch").firstname,
    });
    const result = await parseAndHydrate(booker, response);
    expect(result.ids).toEqual([]);
  });

  test("correctly URL-encodes apostrophes and ampersands", async ({
    booker,
    bookings,
  }) => {
    const marker = buildBooking("SpecialFilter").lastname;
    const firstname = `O'Neil${marker}`;
    const lastname = `Amp&Son${marker}`;
    const bookingId = await bookings.create(
      buildBooking("SpecialFilter", { firstname, lastname }),
    );
    const result = await parseAndHydrate(
      booker,
      await booker.getBookingIds({ firstname, lastname }),
    );

    expect(result.ids).toEqual([bookingId]);
    expect(result.bookings.get(bookingId)).toMatchObject({ firstname, lastname });
  });

  test("characterizes name filtering as case-sensitive", async ({
    booker,
    bookings,
  }) => {
    const mixed = buildBooking("CaseFilter").firstname;
    const lower = mixed.toLowerCase();
    const mixedId = await bookings.create(
      buildBooking("MixedCase", { firstname: mixed }),
    );
    const lowerId = await bookings.create(
      buildBooking("LowerCase", { firstname: lower }),
    );

    expect(
      (await parseAndHydrate(booker, await booker.getBookingIds({ firstname: mixed })))
        .ids,
    ).toEqual([mixedId]);
    expect(
      (await parseAndHydrate(booker, await booker.getBookingIds({ firstname: lower })))
        .ids,
    ).toEqual([lowerId]);
    expect(
      (
        await parseAndHydrate(
          booker,
          await booker.getBookingIds({ firstname: mixed.toUpperCase() }),
        )
      ).ids,
    ).toEqual([]);
  });

  test("includes a booking whose checkin equals the lower boundary", async ({
    booker,
    bookings,
  }) => {
    test.fail(
      true,
      "BUG-API-015: exact checkin boundaries are excluded; see reports/phase-5-filtering-report.md",
    );
    const firstname = buildBooking("CheckinBoundary").firstname;
    const exactId = await bookings.create(
      buildBooking("CheckinExact", {
        firstname,
        bookingdates: { checkin: "2032-04-10", checkout: "2032-04-20" },
      }),
    );
    const laterId = await bookings.create(
      buildBooking("CheckinLater", {
        firstname,
        bookingdates: { checkin: "2032-04-11", checkout: "2032-04-19" },
      }),
    );
    const result = await parseAndHydrate(
      booker,
      await booker.getBookingIds({ firstname, checkin: "2032-04-10" }),
    );

    for (const booking of result.bookings.values()) {
      expect(booking.bookingdates.checkin >= "2032-04-10").toBe(true);
    }
    expect(new Set(result.ids)).toEqual(new Set([exactId, laterId]));
  });

  test("applies checkout as an inclusive upper boundary", async ({
    booker,
    bookings,
  }) => {
    const firstname = buildBooking("CheckoutBoundary").firstname;
    const earlierId = await bookings.create(
      buildBooking("CheckoutEarlier", {
        firstname,
        bookingdates: { checkin: "2032-04-01", checkout: "2032-04-19" },
      }),
    );
    const exactId = await bookings.create(
      buildBooking("CheckoutExact", {
        firstname,
        bookingdates: { checkin: "2032-04-02", checkout: "2032-04-20" },
      }),
    );
    await bookings.create(
      buildBooking("CheckoutLater", {
        firstname,
        bookingdates: { checkin: "2032-04-03", checkout: "2032-04-21" },
      }),
    );
    const result = await parseAndHydrate(
      booker,
      await booker.getBookingIds({ firstname, checkout: "2032-04-20" }),
    );

    expect(new Set(result.ids)).toEqual(new Set([earlierId, exactId]));
    for (const booking of result.bookings.values()) {
      expect(booking.bookingdates.checkout <= "2032-04-20").toBe(true);
    }
  });

  test("applies a combined inclusive date range", async ({ booker, bookings }) => {
    test.fail(
      true,
      "BUG-API-015: combined ranges exclude exact checkin boundaries; see reports/phase-5-filtering-report.md",
    );
    const firstname = buildBooking("CombinedRange").firstname;
    const exactId = await bookings.create(
      buildBooking("RangeExact", {
        firstname,
        bookingdates: { checkin: "2032-05-10", checkout: "2032-05-20" },
      }),
    );
    const insideId = await bookings.create(
      buildBooking("RangeInside", {
        firstname,
        bookingdates: { checkin: "2032-05-11", checkout: "2032-05-19" },
      }),
    );
    await bookings.create(
      buildBooking("RangeOutside", {
        firstname,
        bookingdates: { checkin: "2032-05-09", checkout: "2032-05-21" },
      }),
    );
    const result = await parseAndHydrate(
      booker,
      await booker.getBookingIds({
        firstname,
        checkin: "2032-05-10",
        checkout: "2032-05-20",
      }),
    );

    expect(new Set(result.ids)).toEqual(new Set([exactId, insideId]));
  });

  test("an inverted date range returns no matches", async ({
    booker,
    bookings,
  }) => {
    const firstname = buildBooking("InvertedRange").firstname;
    await bookings.create(
      buildBooking("InvertedRange", {
        firstname,
        bookingdates: { checkin: "2032-06-10", checkout: "2032-06-20" },
      }),
    );
    const result = await parseAndHydrate(
      booker,
      await booker.getBookingIds({
        firstname,
        checkin: "2032-06-20",
        checkout: "2032-06-10",
      }),
    );
    expect(result.ids).toEqual([]);
  });

  test("invalid textual filter dates return a client error", async ({
    booker,
  }) => {
    test.fail(
      true,
      "BUG-API-016: invalid filter dates return 500; see reports/phase-5-filtering-report.md",
    );
    const response = await booker.getBookingIdsWithParams({ checkin: "not-a-date" });
    expect(response.status()).toBe(400);
  });

  test("impossible filter dates are rejected instead of normalized", async ({
    booker,
  }) => {
    test.fail(
      true,
      "BUG-API-013: impossible filter dates are normalized; see reports/phase-5-filtering-report.md",
    );
    const response = await booker.getBookingIdsWithParams({ checkin: "2032-02-30" });
    if (response.status() === 200) await parseAndHydrate(booker, response);
    expect(response.status()).toBe(400);
  });

  test("unknown filter parameters are ignored", async ({ booker, bookings }) => {
    const bookingId = await bookings.create(buildBooking("UnknownFilter"));
    const result = await parseAndHydrate(
      booker,
      await booker.getBookingIdsWithParams({ unknown: "ignored" }),
    );
    expect(result.ids).toContain(bookingId);
  });

  test("characterizes limit and offset as unsupported", async ({
    booker,
    bookings,
  }) => {
    const firstId = await bookings.create(buildBooking("PaginationOne"));
    const secondId = await bookings.create(buildBooking("PaginationTwo"));
    const limited = await parseAndHydrate(
      booker,
      await booker.getBookingIdsWithParams({ limit: 1 }),
    );
    const offset = await parseAndHydrate(
      booker,
      await booker.getBookingIdsWithParams({ offset: 1 }),
    );

    expect(limited.ids).toEqual(expect.arrayContaining([firstId, secondId]));
    expect(offset.ids).toEqual(expect.arrayContaining([firstId, secondId]));
  });
});
