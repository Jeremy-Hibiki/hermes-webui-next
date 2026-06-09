import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginPage } from "@/app/login/login-page";

describe("LoginPage", () => {
  it("renders password input and login button", () => {
    render(<LoginPage onLogin={vi.fn()} />);
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /login/i })).toBeTruthy();
  });

  it("calls onLogin with password on submit", () => {
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);
    const input = screen.getByLabelText(/password/i);
    fireEvent.change(input, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(onLogin).toHaveBeenCalledWith("secret");
  });
});
