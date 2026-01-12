import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createRegistrationQrCode,
  getFacilityQrCodes,
  getQrCodeById,
  toggleQrCodeStatus,
  createRegistrationAttempt,
  updateRegistrationAttemptStatus,
  getRegistrationAttemptByToken,
  getQrCodeStatistics,
} from "../db/qrcode";

describe("QRCode Router", () => {
  let qrCodeId: string;
  let attemptId: string;
  let sessionToken: string;

  const facilityId = "test_facility_001";
  const facilityName = "テスト施設";
  const registrationUrl = "https://example.com/register";

  beforeAll(async () => {
    // テスト用QRコードを作成
    const qrCode = await createRegistrationQrCode(
      facilityId,
      facilityName,
      registrationUrl
    );
    qrCodeId = qrCode.qrCodeId;
  });

  afterAll(async () => {
    // クリーンアップ
  });

  it("should create a registration QR code", async () => {
    const qrCode = await getQrCodeById(qrCodeId);

    expect(qrCode).toBeDefined();
    expect(qrCode?.qrCodeId).toBe(qrCodeId);
    expect(qrCode?.facilityId).toBe(facilityId);
    expect(qrCode?.facilityName).toBe(facilityName);
    expect(qrCode?.isActive).toBe(1);
  });

  it("should retrieve facility QR codes", async () => {
    const qrCodes = await getFacilityQrCodes(facilityId);

    expect(Array.isArray(qrCodes)).toBe(true);
    expect(qrCodes.length).toBeGreaterThan(0);
    expect(qrCodes.some((qr) => qr.qrCodeId === qrCodeId)).toBe(true);
  });

  it("should toggle QR code status", async () => {
    await toggleQrCodeStatus(qrCodeId, 0);

    let qrCode = await getQrCodeById(qrCodeId);
    expect(qrCode?.isActive).toBe(0);

    await toggleQrCodeStatus(qrCodeId, 1);

    qrCode = await getQrCodeById(qrCodeId);
    expect(qrCode?.isActive).toBe(1);
  });

  it("should create a registration attempt", async () => {
    const attempt = await createRegistrationAttempt(
      qrCodeId,
      facilityId,
      "192.168.1.1",
      "Mozilla/5.0"
    );

    attemptId = attempt.attemptId;
    sessionToken = attempt.sessionToken;

    expect(attempt).toBeDefined();
    expect(attempt.qrCodeId).toBe(qrCodeId);
    expect(attempt.facilityId).toBe(facilityId);
    expect(attempt.status).toBe("initiated");
  });

  it("should update registration attempt status", async () => {
    await updateRegistrationAttemptStatus(attemptId, "in_progress");

    let attempt = await getRegistrationAttemptByToken(sessionToken);
    expect(attempt?.status).toBe("in_progress");

    await updateRegistrationAttemptStatus(attemptId, "completed", "cust_001");

    attempt = await getRegistrationAttemptByToken(sessionToken);
    expect(attempt?.status).toBe("completed");
    expect(attempt?.customerId).toBe("cust_001");
  });

  it("should retrieve registration attempt by token", async () => {
    const attempt = await getRegistrationAttemptByToken(sessionToken);

    expect(attempt).toBeDefined();
    expect(attempt?.sessionToken).toBe(sessionToken);
    expect(attempt?.status).toBe("completed");
  });

  it("should get QR code statistics", async () => {
    const stats = await getQrCodeStatistics(facilityId, qrCodeId);

    expect(stats).toBeDefined();
    expect(stats.totalAttempts).toBeGreaterThanOrEqual(1);
    expect(stats.completedRegistrations).toBeGreaterThanOrEqual(0);
    expect(stats.conversionRate).toBeGreaterThanOrEqual(0);
    expect(stats.conversionRate).toBeLessThanOrEqual(100);
  });

  it("should handle non-existent QR code", async () => {
    const qrCode = await getQrCodeById("non_existent_qr_code");
    expect(qrCode).toBeNull();
  });

  it("should handle non-existent registration attempt", async () => {
    const attempt = await getRegistrationAttemptByToken("invalid_token");
    expect(attempt).toBeNull();
  });

  it("should get statistics for facility with no attempts", async () => {
    const stats = await getQrCodeStatistics("non_existent_facility");

    expect(stats).toBeDefined();
    expect(stats.totalAttempts).toBe(0);
    expect(stats.completedRegistrations).toBe(0);
    expect(stats.conversionRate).toBe(0);
  });
});
