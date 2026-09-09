import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ captureQuizLead: vi.fn() }));

vi.mock("@/domain/quiz/lead-capture", () => ({ captureQuizLead: mocks.captureQuizLead }));
vi.mock("@/domain/quiz/catalog", () => ({ recommendQuizPackage: vi.fn() }));

import { captureQuizLeadAction } from "@/app/(site)/quiz/actions";

describe("captureQuizLeadAction", () => {
  it("delegates the input and returns only the creation status", async () => {
    const input = { consent: false as const };
    mocks.captureQuizLead.mockResolvedValue({ created: false, email: "must-not-leak@example.com" });

    await expect(captureQuizLeadAction(input)).resolves.toEqual({ created: false });

    expect(mocks.captureQuizLead).toHaveBeenCalledWith(input);
  });
});
