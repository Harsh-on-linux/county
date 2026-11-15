import { it, expect } from "vitest";
import { moneyKey } from "./MoneyField";
it("builds exact monetary strings without floating point arithmetic", () => {
  let value = "";
  for (const key of ["0", "0", "1", "2", ".", "3", "4", "5", "."])
    value = moneyKey(value, key);
  expect(value).toBe("12.34");
  expect(moneyKey(value, "backspace")).toBe("12.3");
  expect(moneyKey(value, "clear")).toBe("");
});
it("starts decimal values with a zero and bounds whole digits", () => {
  expect(moneyKey("", ".")).toBe("0.");
  expect(moneyKey("12345678901", "2")).toBe("12345678901");
  expect(moneyKey("", "-")).toBe("");
  expect(moneyKey("", "e")).toBe("");
});
