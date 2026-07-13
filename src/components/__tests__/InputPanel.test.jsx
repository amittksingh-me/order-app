import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InputPanel from "../InputPanel";

describe("InputPanel", () => {
  it("renders the textarea", () => {
    render(<InputPanel value="" onChange={() => {}} onEnrich={() => {}} onLaunch={() => {}} onClear={() => {}} />);
    expect(screen.getByPlaceholderText(/type or speak/i)).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const handleChange = vi.fn();
    render(<InputPanel value="" onChange={handleChange} onEnrich={() => {}} onLaunch={() => {}} onClear={() => {}} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "milk" } });
    expect(handleChange).toHaveBeenCalledWith("milk");
  });

  it("renders Prep List and Launch buttons", () => {
    render(<InputPanel value="" onChange={() => {}} onEnrich={() => {}} onLaunch={() => {}} onClear={() => {}} />);
    expect(screen.getByText("Prep List")).toBeInTheDocument();
    expect(screen.getByText("Launch BigBasket")).toBeInTheDocument();
  });
});
