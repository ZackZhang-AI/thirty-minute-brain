import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the main search surface", async () => {
    render(<App />);

    expect(screen.getByText("Thirty-Minute Brain")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search your last 30 minutes...")).toBeInTheDocument();
    expect(await screen.findByText("还没有临时记忆")).toBeInTheDocument();
  });
});

