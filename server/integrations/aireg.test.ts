import { describe, expect, it } from "vitest";
import { validateAiregCredentials } from "./aireg";

describe("AirReg API Integration", () => {
  it("validates AirReg credentials", async () => {
    const result = await validateAiregCredentials();
    
    // エアレジAPIが有効な場合、resultはtrueを返す
    // 無効な場合、エラーをスロー
    expect(typeof result).toBe("boolean");
    expect(result).toBe(true);
  });
});
