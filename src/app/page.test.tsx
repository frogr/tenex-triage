import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SignInButton } from "./sign-in-button";

describe("SignInButton", () => {
  it("renders the sign in button", () => {
    render(<SignInButton />);
    expect(
      screen.getByRole("button", { name: /sign in with google/i })
    ).toBeInTheDocument();
  });
});
