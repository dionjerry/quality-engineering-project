import { expect } from "@playwright/test";

import type { RestfulBookerClient } from "../clients/restful-booker.client.js";
import { CreatedBookingSchema, type Booking } from "../schemas/api.schemas.js";

export class BookingTracker {
  private readonly bookingIds = new Set<number>();

  public constructor(
    private readonly client: RestfulBookerClient,
    private readonly cleanupToken: string,
  ) {}

  public async create(booking: Booking): Promise<number> {
    const response = await this.client.createBooking(booking);
    expect(response.status()).toBe(200);
    const created = CreatedBookingSchema.parse(await response.json());
    this.bookingIds.add(created.bookingid);
    return created.bookingid;
  }

  public forget(bookingId: number): void {
    this.bookingIds.delete(bookingId);
  }

  public track(bookingId: number): void {
    this.bookingIds.add(bookingId);
  }

  public async cleanup(): Promise<void> {
    const failures: string[] = [];
    for (const bookingId of this.bookingIds) {
      try {
        const deletion = await this.client.deleteBooking(
          bookingId,
          this.cleanupToken,
        );
        if (![201, 405].includes(deletion.status())) {
          failures.push(`booking ${bookingId}: delete returned ${deletion.status()}`);
          continue;
        }
        const lookup = await this.client.getBooking(bookingId);
        if (lookup.status() !== 404) {
          failures.push(`booking ${bookingId}: lookup returned ${lookup.status()}`);
        }
      } catch (error) {
        failures.push(
          `booking ${bookingId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    this.bookingIds.clear();
    if (failures.length > 0) {
      throw new Error(`Booking cleanup failed: ${failures.join("; ")}`);
    }
  }
}
