import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FireDrillReports from "./FireDrillReports";
import { useAuthContext } from "../../context/AuthContext";
import { useCustomerLiveData } from "../../hooks/useCustomerLiveData";
import { isSubmittedFireDrill } from "../../services/fireDrillService";

jest.mock("../../context/AuthContext", () => ({
  useAuthContext: jest.fn()
}));

jest.mock("../../hooks/useCustomerLiveData", () => ({
  useCustomerLiveData: jest.fn()
}));

jest.mock("../../services/fireDrillService", () => ({
  addFireDrillCustomerFeedback: jest.fn(),
  isSubmittedFireDrill: jest.fn(
    (drill) =>
      ["completed", "conducted", "submitted", "approved"].includes(
        String(drill?.status || drill?.reportStatus || "").toLowerCase()
      ) || Boolean(drill?.actualDate || drill?.completedAt)
  )
}));

beforeEach(() => {
  jest.clearAllMocks();
  isSubmittedFireDrill.mockImplementation(
    (drill) =>
      ["completed", "conducted", "submitted", "approved"].includes(
        String(drill?.status || drill?.reportStatus || "").toLowerCase()
      ) || Boolean(drill?.actualDate || drill?.completedAt)
  );
  useAuthContext.mockReturnValue({
    user: { uid: "customer-1", fullName: "Customer User" }
  });
});

test("shows the latest submitted FSM Fire Drill result instead of a future schedule", () => {
  useCustomerLiveData.mockReturnValue({
    loading: false,
    fireDrills: [
      {
        id: "scheduled-1",
        buildingId: "building-1",
        buildingName: "North Tower",
        drillType: "Future Alarm Test",
        drillDate: "2026-08-20",
        status: "Scheduled"
      },
      {
        id: "completed-1",
        buildingId: "building-1",
        buildingName: "North Tower",
        drillType: "Full Evacuation Result",
        drillDate: "2026-07-20",
        actualDate: "2026-07-26",
        status: "Completed",
        totalEvacuationTime: "04:30",
        observations: "All occupants reached the assembly point."
      }
    ]
  });

  render(
    <MemoryRouter>
      <FireDrillReports />
    </MemoryRouter>
  );

  expect(screen.getAllByText("Full Evacuation Result").length).toBeGreaterThan(0);
  expect(
    screen.getByText("All occupants reached the assembly point.")
  ).toBeInTheDocument();
  expect(screen.getAllByText("04:30").length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Download Latest Report" })).toBeEnabled();
});

test("does not show sample report data when the customer has no Fire Drills", () => {
  useCustomerLiveData.mockReturnValue({
    loading: false,
    fireDrills: []
  });

  render(
    <MemoryRouter>
      <FireDrillReports />
    </MemoryRouter>
  );

  expect(screen.getByText("No fire drill records found.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download Latest Report" })).toBeDisabled();
  expect(screen.queryByText("Tech Park B")).not.toBeInTheDocument();
});
