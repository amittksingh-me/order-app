import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MemoryPanel from "../MemoryPanel";

const builtin = {
  "milk": { product: "Milk", brand: "Brand", size: "1 L", defaultQty: 1, category: "Dairy", keywords: ["milk"] },
};

const userMemory = {
  "custom": { product: "Custom", brand: "X", size: "1", defaultQty: 1, category: "Other", keywords: ["custom"] },
};

describe("MemoryPanel", () => {
  it("defaults to Learned tab", () => {
    render(
      <MemoryPanel
        builtin={builtin}
        userMemory={userMemory}
        onReset={() => {}}
        onExport={() => {}}
        onImport={() => {}}
        onDeleteLearned={() => {}}
        onEdit={() => {}}
        onAdd={() => {}}
        onSync={() => {}}
        lastSync={null}
        syncUrl=""
        onUrlChange={() => {}}
      />
    );
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("switches to Built-in tab on click", () => {
    render(
      <MemoryPanel
        builtin={builtin}
        userMemory={userMemory}
        onReset={() => {}}
        onExport={() => {}}
        onImport={() => {}}
        onDeleteLearned={() => {}}
        onEdit={() => {}}
        onAdd={() => {}}
        onSync={() => {}}
        lastSync={null}
        syncUrl=""
        onUrlChange={() => {}}
      />
    );
    fireEvent.click(screen.getByText("Built-in"));
    expect(screen.getByText("Milk")).toBeInTheDocument();
  });

  it("renders Add product button", () => {
    render(
      <MemoryPanel
        builtin={builtin}
        userMemory={userMemory}
        onReset={() => {}}
        onExport={() => {}}
        onImport={() => {}}
        onDeleteLearned={() => {}}
        onEdit={() => {}}
        onAdd={() => {}}
        onSync={() => {}}
        lastSync={null}
        syncUrl=""
        onUrlChange={() => {}}
      />
    );
    expect(screen.getByText("Add product")).toBeInTheDocument();
  });
});
