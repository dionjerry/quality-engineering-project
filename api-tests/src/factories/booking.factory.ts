import { randomUUID } from "node:crypto";

import type { Booking } from "../schemas/api.schemas.js";

export function buildBooking(label = "Test"): Booking {
  const runId = randomUUID().replaceAll("-", "").slice(0, 12);
  return {
    firstname: `Auth${label}`,
    lastname: `Run${runId}`,
    totalprice: 175,
    depositpaid: true,
    bookingdates: {
      checkin: "2026-09-10",
      checkout: "2026-09-12",
    },
    additionalneeds: "Phase 2 authorization test",
  };
}

