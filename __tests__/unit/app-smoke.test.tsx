import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("App Smoke", () => {
  it("renders the Hermes app shell", () => {
    render(<Home />);
    expect(screen.getByText(/hermes/i)).toBeDefined();
  });
});
