import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AiPrioritySettings from "./AiPrioritySettings";
import {
  getIssuePriorityPolicy,
  updateIssuePriorityPolicy
} from "../../services/aiPriorityService";

jest.mock("../../services/aiPriorityService", () => ({
  getIssuePriorityPolicy: jest.fn(),
  updateIssuePriorityPolicy: jest.fn()
}));

test("loads and updates the FSM risk rubric", async () => {
  getIssuePriorityPolicy.mockResolvedValue({
    enabled: true,
    definitions: {
      Low: "Minor impact",
      Medium: "Prompt action",
      High: "Immediate danger"
    },
    additionalInstructions: "Escalate disabled alarms.",
    version: 3
  });
  updateIssuePriorityPolicy.mockResolvedValue({ success: true, version: 4 });

  render(<AiPrioritySettings />);

  expect(await screen.findByDisplayValue("Immediate danger")).toBeInTheDocument();
  fireEvent.change(screen.getByDisplayValue("Minor impact"), {
    target: { value: "Minor impact with no immediate hazard" }
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save AI priority policy" })
  );

  await waitFor(() =>
    expect(updateIssuePriorityPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        definitions: expect.objectContaining({
          Low: "Minor impact with no immediate hazard"
        })
      })
    )
  );
  expect(await screen.findByText("AI priority policy version 4 saved.")).toBeInTheDocument();
});
