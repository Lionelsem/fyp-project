import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { InspectionSubmitAction } from "./Inspections";

test("inspection submit action is rendered without scroll visibility state", () => {
  const onSubmit = jest.fn();

  render(
    <InspectionSubmitAction
      completedCount={12}
      totalRows={15}
      onSubmit={onSubmit}
      disabled={false}
      submitting={false}
    />
  );

  expect(screen.getByText("12 / 15 completed")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Submit Inspection" }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test("inspection submit action preserves disabled and submitting states", () => {
  render(
    <InspectionSubmitAction
      completedCount={15}
      totalRows={15}
      onSubmit={() => {}}
      disabled={false}
      submitting
    />
  );

  expect(screen.getByRole("button", { name: "Submitting..." })).toBeDisabled();
});
