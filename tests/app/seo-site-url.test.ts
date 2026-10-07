// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/inventory/public-clutch", () => ({
  listPublicPaixaoClutches: vi.fn().mockResolvedValue([]),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("public metadata site URL", () => {
  it.each([
    { value: undefined, base: "https://studiocarollucas.com.br" },
    { value: "", base: "https://studiocarollucas.com.br" },
    { value: "   ", base: "https://studiocarollucas.com.br" },
    { value: " https://preview.studio.test/ ", base: "https://preview.studio.test" },
  ])("loads robots and sitemap with site URL $value", async ({ value, base }) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
    vi.resetModules();
    const { default: robots } = await import("@/app/robots");
    const { default: sitemap } = await import("@/app/sitemap");
    expect(robots().sitemap).toBe(`${base}/sitemap.xml`);
    expect((await sitemap())[0].url).toBe(`${base}/`);
  });
});
