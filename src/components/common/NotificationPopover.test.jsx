import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

test("removes a notification with its cross button", () => {
  jest.useFakeTimers();
  const handleDismiss = jest.fn();
  render(
    <NotificationPopover
      onDismiss={handleDismiss}
      notifications={[{
        id: "customer-remark",
        title: "New customer remark",
        message: "Please review the west stairwell.",
        isRead: false
      }]}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove notification: New customer remark" }));
  act(() => jest.advanceTimersByTime(220));

  expect(screen.queryByText("New customer remark")).not.toBeInTheDocument();
  expect(screen.getByText("You're all caught up")).toBeInTheDocument();
  expect(handleDismiss).toHaveBeenCalledWith("customer-remark");
  jest.useRealTimers();
});

test("keeps unread chat notifications until the conversation is read", () => {
  render(
    <NotificationPopover
      notifications={[{
        id: "feedback-thread-message",
        title: "New message from Customer One",
        message: "Please review my feedback.",
        isRead: false,
        dismissible: false
      }]}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));

  expect(screen.getByText("New message from Customer One")).toBeInTheDocument();
  expect(screen.queryByRole("button", {
    name: "Remove notification: New message from Customer One"
  })).not.toBeInTheDocument();
});
