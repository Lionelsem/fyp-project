import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ClosedIssueHistoryModal } from "./Issues";

afterEach(() => {
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";
});

test("closed issue dialog separates its status from its only close control", () => {
  const onClose = jest.fn();

  render(
    <ClosedIssueHistoryModal
      issue={{
        id: "issue-1",
        issueTitle: "Main Fire Alarm Panel",
        status: "Closed",
        buildingName: "Pioneer Tech Hub",
        floorName: "Level 1",
        location: "Level 1",
        priority: "Low",
        issueDescription: "Resolved issue",
      }}
      onClose={onClose}
    />
  );

  expect(screen.getByRole("dialog", { name: "Main Fire Alarm Panel" })).toBeInTheDocument();
  expect(screen.getByText("Closed")).toHaveClass("issue-status--closed");
  expect(screen.getAllByRole("button")).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: "Close issue history" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
