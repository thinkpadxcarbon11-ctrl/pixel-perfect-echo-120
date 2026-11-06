import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ inputValidator: () => ({ handler: (handler: unknown) => handler }) }) }));
import { callNewsletterWebhook } from "@/lib/newsletter.functions";

const data = { action: "unsubscribe" as const, name: "Unsubscribe Test", email: "unsubscribe-test@example.com", job_type: "Remote Jobs" as const };
afterEach(() => vi.unstubAllGlobals());
describe("Unsubscribe webhook", () => {
  it("POSTs only actual subscriber fields to the exact requested URL", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, status: "unsubscribed", message: "Done" })));
    vi.stubGlobal("fetch", fetch);
    const result = await callNewsletterWebhook({ data });
    expect(fetch).toHaveBeenCalledWith("https://n8n.hablu-programmer.com/webhook-test/job_newsletter2", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, email: data.email, job_type: data.job_type }),
    });
    expect(result).toEqual({ success: true, status: "unsubscribed", message: "Done" });
  });
  it("rejects an unsuccessful HTTP response even if its body claims success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, status: "unsubscribed" }), { status: 500 })));
    expect((await callNewsletterWebhook({ data })).success).toBe(false);
  });
});