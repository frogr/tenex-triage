import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("Landing page", () => {
  it("renders the headline", () => {
    render(<Home />);
    expect(screen.getByText("Your inbox is chaos.")).toBeInTheDocument();
    expect(screen.getByText("We fix that.")).toBeInTheDocument();
  });

  it("renders the subheadline", () => {
    render(<Home />);
    expect(
      screen.getByText(/200 emails\. 5 seconds\. Zero stress\./)
    ).toBeInTheDocument();
  });

  it("renders the sign in button", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: /sign in with google/i })
    ).toBeInTheDocument();
  });

  it("renders the footer attribution", () => {
    render(<Home />);
    expect(
      screen.getByText(/built for tenex by austin french/i)
    ).toBeInTheDocument();
  });
});
