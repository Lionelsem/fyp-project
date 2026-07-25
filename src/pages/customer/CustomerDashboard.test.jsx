import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CustomerDashboard from "./CustomerDashboard";

test("exposes each compact summary card with its label and value", () => {
  render(
    <MemoryRouter>
      <CustomerDashboard />
    </MemoryRouter>
  );

  const summary = screen.getByRole("list", { name: "Customer issue summary" });
  const cards = within(summary).getAllByRole("listitem");

  expect(cards).toHaveLength(4);
  expect(within(summary).getByRole("listitem", { name: "Open Issues: 3" })).toBeInTheDocument();
  expect(within(summary).getByRole("listitem", { name: "Closed: 48" })).toBeInTheDocument();
});
