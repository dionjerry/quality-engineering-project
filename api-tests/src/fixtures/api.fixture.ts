import { test as base } from "@playwright/test";

import { RestfulBookerClient } from "../clients/restful-booker.client.js";
import { BookingTracker } from "../helpers/booking-tracker.js";
import { AuthSuccessSchema } from "../schemas/api.schemas.js";

interface ApiFixtures {
  booker: RestfulBookerClient;
  validToken: string;
  bookings: BookingTracker;
}

export const test = base.extend<ApiFixtures>({
  booker: async ({ request }, use) => {
    await use(new RestfulBookerClient(request));
  },
  validToken: async ({ booker }, use) => {
    const response = await booker.authenticate({
      username: "admin",
      password: "password123",
    });
    const authentication = AuthSuccessSchema.parse(await response.json());
    await use(authentication.token);
  },
  bookings: async ({ booker, validToken }, use) => {
    const tracker = new BookingTracker(booker, validToken);
    await use(tracker);
    await tracker.cleanup();
  },
});

export { expect } from "@playwright/test";
