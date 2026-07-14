import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, useLocation } from "react-router-dom";
import AdminNavbar from "../admin/AdminNavbar";
import PortalShell from "./PortalShell";

const TestSidebar = ({ onClose, onNavigate }) => (
  <aside aria-label="Test navigation">
    <button type="button" onClick={onClose}>Close drawer</button>
    <Link to="/next" onClick={onNavigate}>Next page</Link>
    <button type="button">Last action</button>
  </aside>
);

const RouteOnlySidebar = ({ onClose }) => (
  <aside aria-label="Route-only navigation">
    <button type="button" onClick={onClose}>Close drawer</button>
    <Link to="/next">Navigate without callback</Link>
  </aside>
);

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
};

const renderShell = (SidebarComponent = TestSidebar) => render(
  <MemoryRouter initialEntries={["/start"]}>
    <PortalShell
      pageTitle="Responsive test"
      profile={{ name: "Test User" }}
      NavbarComponent={AdminNavbar}
      SidebarComponent={SidebarComponent}
    >
      <LocationProbe />
    </PortalShell>
  </MemoryRouter>
);

afterEach(() => {
  document.body.classList.remove("portal-drawer-open");
  document.body.style.overflow = "";
});

test("opens and closes the navigation drawer with accessible state", async () => {
  renderShell();

  const menuButton = screen.getByRole("button", { name: /open navigation menu/i });
  const drawer = document.querySelector(".portal-sidebar-drawer");

  expect(menuButton).toHaveAttribute("aria-expanded", "false");
  expect(menuButton).toHaveAttribute("aria-controls", drawer.id);

  fireEvent.click(menuButton);

  expect(menuButton).toHaveAttribute("aria-expanded", "true");
  expect(drawer).toHaveAttribute("role", "dialog");
  expect(document.body).toHaveClass("portal-drawer-open");
  expect(screen.getByRole("button", { name: "Close drawer" })).toHaveFocus();

  fireEvent.keyDown(document, { key: "Escape" });

  await waitFor(() => {
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveFocus();
  });
});

test("closes from the backdrop and after navigation", async () => {
  renderShell();

  const menuButton = screen.getByRole("button", { name: /open navigation menu/i });
  const backdrop = document.querySelector(".portal-sidebar-backdrop");

  fireEvent.click(menuButton);
  fireEvent.click(backdrop);
  expect(menuButton).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(menuButton);
  fireEvent.click(screen.getByRole("link", { name: "Next page" }));

  await waitFor(() => {
    expect(screen.getByTestId("location")).toHaveTextContent("/next");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});

test("closes when the route changes even without a sidebar callback", async () => {
  renderShell(RouteOnlySidebar);

  const menuButton = screen.getByRole("button", { name: /open navigation menu/i });
  fireEvent.click(menuButton);
  fireEvent.click(screen.getByRole("link", { name: "Navigate without callback" }));

  await waitFor(() => {
    expect(screen.getByTestId("location")).toHaveTextContent("/next");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});

test("keeps keyboard focus inside the open drawer", () => {
  renderShell();

  fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
  const firstAction = screen.getByRole("button", { name: "Close drawer" });
  const lastAction = screen.getByRole("button", { name: "Last action" });

  lastAction.focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(firstAction).toHaveFocus();

  firstAction.focus();
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(lastAction).toHaveFocus();
});
