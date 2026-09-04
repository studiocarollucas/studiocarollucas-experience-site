import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "@/lib/observability/logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits structured JSON with level, message and context on console.error for error()", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("payment failed", { shootId: "abc-123" });

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({
      level: "error",
      message: "payment failed",
      shootId: "abc-123",
    });
    expect(parsed.timestamp).toBeDefined();
  });

  it("routes info() to console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("shoot created");
    expect(spy).toHaveBeenCalledOnce();
  });
});
