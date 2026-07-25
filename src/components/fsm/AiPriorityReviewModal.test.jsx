import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import AiPriorityReviewModal from "./AiPriorityReviewModal";

test("preselects the AI suggestion and allows an FSM override", () => {
  const onConfirm = jest.fn();
  render(
    <AiPriorityReviewModal
      entries={[{
        key: "issue-1",
        itemLabel: "Fire door",
        issueDescription: "Door does not close",
        suggestedPriority: "High",
        currentPriority: "Medium"
      }]}
      onCancel={() => {}}
      onConfirm={onConfirm}
    />
  );

  const select = screen.getByRole("combobox", {
    name: "Final priority for Fire door"
  });
  expect(select).toHaveValue("High");
  fireEvent.change(select, { target: { value: "Medium" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm priorities" }));
  expect(onConfirm).toHaveBeenCalledWith({ "issue-1": "Medium" });
});

test("renders a consolidated review for multiple assessment results", () => {
  render(
    <AiPriorityReviewModal
      entries={[
        { key: "one", itemLabel: "Alarm panel", suggestedPriority: "High" },
        { key: "two", itemLabel: "Faded label", suggestedPriority: "Low" }
      ]}
      onCancel={() => {}}
      onConfirm={() => {}}
    />
  );

  expect(
    screen.getByRole("dialog", { name: "Review AI priority suggestions" })
  ).toBeInTheDocument();
  expect(screen.getByText("Alarm panel")).toBeInTheDocument();
  expect(screen.getByText("Faded label")).toBeInTheDocument();
});
