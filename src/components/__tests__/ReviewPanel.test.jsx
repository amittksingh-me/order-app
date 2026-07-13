import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReviewPanel from "../ReviewPanel";

const sampleItems = [
  { id: "1", input: "milk", normalized: "milk", matched: true, source: "user-memory", fuzzy: false, product: "Milk", preferredProduct: "Milk", brand: "", size: "", alternatives: [], category: "", editable: true, quantity: 1 },
  { id: "2", input: "bread", normalized: "bread", matched: false, source: "unknown", fuzzy: false, product: "", preferredProduct: "bread", brand: "", size: "", alternatives: [], category: "", editable: true, quantity: 1 },
];

describe("ReviewPanel", () => {
  it("renders matched and unknown items", () => {
    render(<ReviewPanel items={sampleItems} onDeleteItem={() => {}} onResetInput={() => {}} />);
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("bread")).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    render(<ReviewPanel items={[]} onDeleteItem={() => {}} onResetInput={() => {}} />);
    expect(screen.getByText(/no items/i)).toBeInTheDocument();
  });

  it("shows clipboard hint", () => {
    render(<ReviewPanel items={sampleItems} onDeleteItem={() => {}} onResetInput={() => {}} />);
    expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
  });
});
