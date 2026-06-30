import { describe, it, expect } from "vitest";
import { extractJson } from "../../lib/generator/extract-json";

describe("extractJson", () => {
  it("parses a clean JSON object", () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it("strips ```json fences", () => {
    expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("strips bare ``` fences", () => {
    expect(extractJson('```\n[1, 2, 3]\n```')).toEqual([1, 2, 3]);
  });

  it("recovers an object after prose preamble", () => {
    expect(extractJson('Sure! Here is the data:\n{"x": "y"}')).toEqual({ x: "y" });
  });

  it("recovers despite trailing junk", () => {
    expect(extractJson('{"x": 1} and that is all')).toEqual({ x: 1 });
  });

  it("handles nested braces inside strings", () => {
    expect(extractJson('garbage {"text": "a } b { c"} tail')).toEqual({
      text: "a } b { c",
    });
  });

  it("handles escaped quotes inside strings", () => {
    expect(extractJson('{"q": "she said \\"hi\\""}')).toEqual({ q: 'she said "hi"' });
  });

  it("balances nested objects", () => {
    expect(extractJson('prefix {"a": {"b": [1, {"c": 2}]}} suffix')).toEqual({
      a: { b: [1, { c: 2 }] },
    });
  });

  it("extracts an array when no object brace is present", () => {
    // No '{' anywhere, so the scanner falls through to the '[' branch
    // (matches the Python reference, which scans '{' before '[').
    expect(extractJson("prefix [1, 2, 3] suffix")).toEqual([1, 2, 3]);
  });

  it("returns null when there is no JSON", () => {
    expect(extractJson("just some words")).toBeNull();
  });
});
