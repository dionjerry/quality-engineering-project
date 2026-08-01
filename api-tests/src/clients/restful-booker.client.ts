import type { APIRequestContext, APIResponse } from "@playwright/test";

import type {
  AuthCredentials,
  Booking,
  BookingPatch,
} from "../schemas/api.schemas.js";

export class RestfulBookerClient {
  public constructor(private readonly request: APIRequestContext) {}

  public async ping(): Promise<APIResponse> {
    return this.request.get("/ping");
  }

  public async authenticate(credentials: AuthCredentials): Promise<APIResponse> {
    return this.request.post("/auth", {
      headers: { "Content-Type": "application/json" },
      data: credentials,
    });
  }

  public async authenticateRaw(body: string): Promise<APIResponse> {
    return this.request.post("/auth", {
      headers: { "Content-Type": "application/json" },
      data: body,
    });
  }

  public async createBooking(booking: Booking): Promise<APIResponse> {
    return this.createBookingPayload(booking);
  }

  public async createBookingPayload(payload: unknown): Promise<APIResponse> {
    return this.request.post("/booking", {
      headers: { "Content-Type": "application/json" },
      data: payload,
    });
  }

  public async createBookingRaw(body: string): Promise<APIResponse> {
    return this.request.post("/booking", {
      headers: { "Content-Type": "application/json" },
      data: body,
    });
  }

  public async getBooking(bookingId: number): Promise<APIResponse> {
    return this.request.get(`/booking/${bookingId}`);
  }

  public async updateBooking(
    bookingId: number,
    booking: Booking,
    token?: string,
  ): Promise<APIResponse> {
    return this.updateBookingPayload(bookingId, booking, token);
  }

  public async updateBookingPayload(
    bookingId: number,
    payload: unknown,
    token?: string,
  ): Promise<APIResponse> {
    return this.request.put(`/booking/${bookingId}`, {
      headers: this.protectedHeaders(token),
      data: payload,
    });
  }

  public async partialUpdateBooking(
    bookingId: number,
    booking: BookingPatch,
    token?: string,
  ): Promise<APIResponse> {
    return this.partialUpdateBookingPayload(bookingId, booking, token);
  }

  public async partialUpdateBookingPayload(
    bookingId: number,
    payload: unknown,
    token?: string,
  ): Promise<APIResponse> {
    return this.request.patch(`/booking/${bookingId}`, {
      headers: this.protectedHeaders(token),
      data: payload,
    });
  }

  public async deleteBooking(
    bookingId: number,
    token?: string,
  ): Promise<APIResponse> {
    if (token === undefined) {
      return this.request.delete(`/booking/${bookingId}`);
    }
    return this.request.delete(`/booking/${bookingId}`, {
      headers: { Cookie: `token=${token}` },
    });
  }

  private protectedHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (token !== undefined) headers.Cookie = `token=${token}`;
    return headers;
  }
}
