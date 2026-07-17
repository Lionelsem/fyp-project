import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import NotificationPopover from "./NotificationPopover";

test("opens and closes the notification popover", () => {
  render(<NotificationPopover />);

  const trigger = screen.getByRole("button", { name: "Notifications" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(trigger);

  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
  expect(screen.getByText("You're all caught up")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Close notifications" }));
  expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();
});

test("shows notifications and closes with Escape", () => {
  render(
    <NotificationPopover
      notifications={[
        {
          id: "inspection-update",
          title: "Inspection updated",
          message: "The inspection report is ready.",
          time: "Just now",
          isRead: false
        }
      ]}
    />
  );

  const trigger = screen.getByRole("button", {
    name: "Notifications, 1 unread"
  });
  fireEvent.click(trigger);

  expect(screen.getByText("Inspection updated")).toBeInTheDocument();
  expect(screen.getByText("The inspection report is ready.")).toBeInTheDocument();

  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();
});

test("closes when clicking outside the popover", () => {
  render(
    <div>
      <NotificationPopover />
      <button type="button">Outside</button>
    </div>
  );

  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));

  expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();
});
