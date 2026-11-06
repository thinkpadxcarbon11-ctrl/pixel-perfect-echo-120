import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { call } = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => call, createServerFn: () => ({ inputValidator: () => ({ handler: () => call }) }) }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => <select aria-label="Job Type" value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>,
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));
import { Route } from "@/routes/index";

async function subscribe() {
  const Component = Route.options.component as React.ComponentType;
  render(<Component />);
  fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Unsubscribe Test" } });
  fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "unsubscribe-test@example.com" } });
  fireEvent.change(screen.getByLabelText("Job Type"), { target: { value: "Remote Jobs" } });
  fireEvent.click(screen.getByRole("button", { name: "Subscribe Now" }));
  await screen.findByRole("button", { name: "Unsubscribe" });
}

describe("Unsubscribe confirmation", () => {
  beforeEach(() => { call.mockReset(); call.mockResolvedValueOnce({ success: true, status: "subscribed", message: "Subscribed" }); });
  afterEach(cleanup);

  it("does not send an unsubscribe request when Cancel is clicked", async () => {
    await subscribe();
    fireEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("sends stored subscriber details once and waits for a successful response", async () => {
    await subscribe();
    let resolve: (value: unknown) => void = () => {};
    call.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    fireEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Unsubscribe" }));
    expect(call).toHaveBeenLastCalledWith({ data: { action: "unsubscribe", name: "Unsubscribe Test", email: "unsubscribe-test@example.com", job_type: "Remote Jobs" } });
    const pending = screen.getByRole("button", { name: "Unsubscribing…" });
    expect(pending).toBeDisabled();
    fireEvent.click(pending);
    expect(call).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: "Subscribe Again" })).not.toBeInTheDocument();
    resolve({ success: true, status: "unsubscribed", message: "You have successfully unsubscribed from Job Letter!" });
    await screen.findByRole("button", { name: "Subscribe Again" });
  });

  it("preserves subscriber details and permits retry after failure", async () => {
    await subscribe();
    call.mockResolvedValueOnce({ success: false, status: "error", message: "Service unavailable" });
    fireEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Unsubscribe" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Service unavailable"));
    expect(screen.getByText("unsubscribe-test@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unsubscribe" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Subscribe Again" })).not.toBeInTheDocument();
  });
});