import { describe, it, expect, vi, beforeEach } from "vitest";
import { getConfirmedReservationsForTomorrow } from "./notion";
import { sendReservationReminder } from "./_core/line";

// Notion関数とLINE関数をモック
vi.mock("./notion", () => ({
  getConfirmedReservationsForTomorrow: vi.fn(),
}));

vi.mock("./_core/line", () => ({
  sendReservationReminder: vi.fn(),
}));

describe("Reservation Reminder Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get confirmed reservations for tomorrow", async () => {
    const mockReservations = [
      {
        id: "test-id-1",
        url: "https://www.notion.so/test-id-1",
        title: "田中太郎 - 整体",
        customerName: "田中太郎",
        customerPhone: "09012345678",
        serviceType: "整体",
        reservationDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: "腰痛の治療",
      },
    ];

    vi.mocked(getConfirmedReservationsForTomorrow).mockResolvedValue(mockReservations);

    const reservations = await getConfirmedReservationsForTomorrow();

    expect(reservations).toHaveLength(1);
    expect(reservations[0].customerName).toBe("田中太郎");
    expect(reservations[0].serviceType).toBe("整体");
  });

  it("should send reminder to customer", async () => {
    const reminderParams = {
      customerPhone: "09012345678",
      customerName: "田中太郎",
      serviceType: "整体",
      reservationDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: "腰痛の治療",
    };

    vi.mocked(sendReservationReminder).mockResolvedValue(true);

    const result = await sendReservationReminder(reminderParams);

    expect(result).toBe(true);
    expect(sendReservationReminder).toHaveBeenCalledWith(reminderParams);
  });

  it("should handle empty reservations list", async () => {
    vi.mocked(getConfirmedReservationsForTomorrow).mockResolvedValue([]);

    const reservations = await getConfirmedReservationsForTomorrow();

    expect(reservations).toHaveLength(0);
  });

  it("should handle reminder sending failure", async () => {
    const reminderParams = {
      customerPhone: "09012345678",
      customerName: "田中太郎",
      serviceType: "整体",
      reservationDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    vi.mocked(sendReservationReminder).mockResolvedValue(false);

    const result = await sendReservationReminder(reminderParams);

    expect(result).toBe(false);
  });
});
