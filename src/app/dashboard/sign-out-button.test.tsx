import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SignOutButton } from "./sign-out-button";

describe("SignOutButton", () => {
  it("renders the sign out button", () => {
    render(<SignOutButton />);
    expect(
      screen.getByRole("button", { name: /sign out/i })
    ).toBeInTheDocument();
  });
});
