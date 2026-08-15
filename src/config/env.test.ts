import { describe, it, expect } from "vitest";
import { env } from "./env";

describe("env configuration", () => {
  it("defaults to backend mode instead of mock mode", () => {
    expect(env.useMockApi).toBe(false);
  });
});
