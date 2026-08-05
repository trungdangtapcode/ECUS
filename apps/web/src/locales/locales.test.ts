import { describe, expect, it } from "vitest";
import en from "./en.json";
import vi from "./vi.json";

function flatten(value: object, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof item === "string"
        ? [[path, item]]
        : Object.entries(flatten(item as object, path));
    }),
  );
}

describe("locale contracts", () => {
  it("keeps translation keys and interpolation variables aligned", () => {
    const english = flatten(en);
    const vietnamese = flatten(vi);
    expect(Object.keys(vietnamese).sort()).toEqual(Object.keys(english).sort());
    for (const key of Object.keys(english)) {
      expect(vietnamese[key]?.trim().length).toBeGreaterThan(0);
      expect(vietnamese[key]?.match(/\{\{.*?\}\}/g) ?? []).toEqual(
        english[key]?.match(/\{\{.*?\}\}/g) ?? [],
      );
    }
  });
});
