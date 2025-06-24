import { describe, it, expect } from "vitest";
import { inferTimezone } from "../data";

describe("inferTimezone", () => {
  it("maps CA to America/Los_Angeles", () => {
    expect(inferTimezone("Los Angeles, CA")).toBe("America/Los_Angeles");
  });

  it("defaults to America/New_York for unknown", () => {
    expect(inferTimezone("Somewhere, XX")).toBe("America/New_York");
  });
}); 