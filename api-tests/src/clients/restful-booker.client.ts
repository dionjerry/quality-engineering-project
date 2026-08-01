import type { APIRequestContext, APIResponse } from "@playwright/test";

export class RestfulBookerClient {
  public constructor(private readonly request: APIRequestContext) {}

  public async ping(): Promise<APIResponse> {
    return this.request.get("/ping");
  }
}

