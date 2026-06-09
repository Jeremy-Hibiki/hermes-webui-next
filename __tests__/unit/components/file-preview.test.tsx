import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilePreview } from "@/components/workspace/file-preview";

describe("FilePreview", () => {
  it("renders code content with file path", () => {
    render(<FilePreview path="src/index.ts" content="console.log('hi')" />);
    expect(screen.getByText("src/index.ts")).toBeTruthy();
    expect(screen.getByText(/console\.log/)).toBeTruthy();
  });

  it("renders image when path is image", () => {
    render(<FilePreview path="img/photo.png" content="" />);
    const img = screen.getByRole("img");
    expect(img).toBeTruthy();
  });

  it("renders nothing when no content and not image", () => {
    const { container } = render(<FilePreview path="src/empty.ts" content="" />);
    expect(container.innerHTML).toBe("");
  });

  it("shows close button when onClose provided", () => {
    render(
      <FilePreview path="src/app.ts" content="export {}" onClose={vi.fn()} />
    );
    expect(screen.getByLabelText(/close/i)).toBeTruthy();
  });
});
