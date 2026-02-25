import { describe, it, expect } from "vitest";
import { DEFAULT_BUCKETS } from "./buckets";

describe("DEFAULT_BUCKETS", () => {
  it("has 5 default buckets", () => {
    expect(DEFAULT_BUCKETS).toHaveLength(5);
  });

  it("has unique sort orders", () => {
    const orders = DEFAULT_BUCKETS.map((b) => b.sortOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("has unique names", () => {
    const names = DEFAULT_BUCKETS.map((b) => b.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("includes expected bucket names", () => {
    const names = DEFAULT_BUCKETS.map((b) => b.name);
    expect(names).toContain("Needs Action");
    expect(names).toContain("FYI");
    expect(names).toContain("Newsletters");
    expect(names).toContain("Notifications");
    expect(names).toContain("Auto-Archive");
  });

  it("every bucket has a non-empty description", () => {
    for (const bucket of DEFAULT_BUCKETS) {
      expect(bucket.description.length).toBeGreaterThan(0);
    }
  });
});
