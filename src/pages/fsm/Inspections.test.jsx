import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  InspectionSubmitAction,
  InspectionSubmitConfirmation
} from "./Inspections";

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

test("inspection confirmation shows the summary and handles both actions", () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();

  render(
    <InspectionSubmitConfirmation
      completedCount={15}
      totalRows={15}
      defectCount={2}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );

  expect(
    screen.getByRole("dialog", { name: "Submit inspection checklist?" })
  ).toBeInTheDocument();
  expect(screen.getByText("15 / 15")).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onCancel).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Submit inspection" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
