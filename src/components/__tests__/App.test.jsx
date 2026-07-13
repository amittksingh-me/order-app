import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../App";

vi.mock("../../data/products.json", () => ({
  default: { "milk": { product: "Milk", brand: "Brand", size: "1 L", defaultQty: 1, category: "Dairy", keywords: ["milk"] } },
}));

vi.mock("../../lib/draft", () => ({
  getDraft: vi.fn().mockResolvedValue(null),
  saveDraft: vi.fn().mockResolvedValue(),
  deleteDraft: vi.fn().mockResolvedValue(),
}));

vi.mock("../../lib/memory", () => ({
  getAllMemory: vi.fn().mockResolvedValue({}),
  putMemory: vi.fn().mockResolvedValue(),
  clearMemory: vi.fn().mockResolvedValue(),
  deleteMemory: vi.fn().mockResolvedValue(),
  importMemory: vi.fn().mockResolvedValue(),
}));

vi.mock("../../lib/sheets", () => ({
  syncSheet: vi.fn().mockResolvedValue({ count: 0, memory: {} }),
}));

describe("App", () => {
  it("renders the header", () => {
    render(<App />);
    expect(screen.getByText("BaskIt")).toBeInTheDocument();
  });

  it("renders the list tab by default", () => {
    render(<App />);
    expect(screen.getByText("List")).toBeInTheDocument();
  });

  it("renders version badge", () => {
    render(<App />);
    expect(screen.getByText(/v0\.2\.0/)).toBeInTheDocument();
  });
});
