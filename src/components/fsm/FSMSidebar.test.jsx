import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FSMSidebar from "./FSMSidebar";

jest.mock("../../services/authService", () => ({
  logout: jest.fn(() => Promise.resolve())
}));

test("FSM submenu expands without navigating and exposes each destination", () => {
  const onNavigate = jest.fn();

  render(
    <MemoryRouter initialEntries={["/fsm/dashboard"]}>
      <FSMSidebar
        profile={{ name: "FSM User", role: "Fire Safety Manager", initials: "FU" }}
        onClose={jest.fn()}
        onNavigate={onNavigate}
      />
    </MemoryRouter>
  );

  const inspectionToggle = screen.getByRole("button", { name: /inspection/i });
  fireEvent.click(inspectionToggle);

  expect(inspectionToggle).toHaveAttribute("aria-expanded", "true");
  expect(onNavigate).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: "My Inspections" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Verify Closure" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("link", { name: "Verify Closure" }));
  expect(onNavigate).toHaveBeenCalledTimes(1);
});

test("building submenu includes an explicit overview destination", () => {
  render(
    <MemoryRouter initialEntries={["/fsm/dashboard"]}>
      <FSMSidebar
        profile={{ name: "FSM User" }}
        onClose={jest.fn()}
        onNavigate={jest.fn()}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: /my building/i }));

  expect(screen.getByRole("link", { name: "Building Overview" })).toHaveAttribute(
    "href",
    "/fsm/building"
  );
  expect(screen.getByRole("link", { name: "Fire Drill" })).toHaveAttribute(
    "href",
    "/fsm/fire-drill"
  );
  expect(screen.getByRole("link", { name: /comments\/feedbacks/i })).toHaveAttribute(
    "href",
    "/fsm/feedbacks"
  );
  expect(screen.getByRole("link", { name: "AI Priority Settings" })).toHaveAttribute(
    "href",
    "/fsm/ai-priority-settings"
  );
});
