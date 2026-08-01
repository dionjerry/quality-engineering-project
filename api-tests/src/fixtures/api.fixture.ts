import { test as base } from "@playwright/test";

import { RestfulBookerClient } from "../clients/restful-booker.client.js";

interface ApiFixtures {
  booker: RestfulBookerClient;
}

export const test = base.extend<ApiFixtures>({
  booker: async ({ request }, use) => {
    await use(new RestfulBookerClient(request));
  },
});

export { expect } from "@playwright/test";

