import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginPage } from "@/app/login/login-page";

describe("LoginPage", () => {
  it("renders password input and login button", () => {
    render(<LoginPage onLogin={vi.fn()} />);
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /login/i })).toBeTruthy();
  });

  it("calls onLogin with password on submit", () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginPage onLogin={onLogin} />);
    const input = screen.getByLabelText(/password/i);
    fireEvent.change(input, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(onLogin).toHaveBeenCalledWith("secret");
  });

  it("displays error message when error prop is provided", () => {
    render(<LoginPage onLogin={vi.fn()} error="Invalid password" />);
    expect(screen.getByText("Invalid password")).toBeTruthy();
  });
});
