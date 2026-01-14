import { saveCustomerRegistrationToSheets } from "./server/_core/googleSheets.js";

const testData = {
  customerId: "test-customer-123",
  fullName: "テスト顧客",
  phone: "09012345678",
  email: "test-customer@example.com",
  dateOfBirth: new Date("1990-01-01"),
  gender: "male",
  postalCode: "1234567",
  prefecture: "東京都",
  city: "渋谷区",
  addressLine1: "テスト町1-2-3",
  addressLine2: "テストビル4F",
  createdAt: new Date(),
};

console.log("Testing customer registration to Google Sheets...");
try {
  await saveCustomerRegistrationToSheets(testData);
  console.log("✅ Customer registration saved to Google Sheets successfully!");
} catch (error) {
  console.error("❌ Failed to save customer registration:", error);
}
