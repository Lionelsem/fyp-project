import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import FireDrill from "./FireDrill";
import { useAuthContext } from "../../context/AuthContext";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";

jest.mock("../../context/AuthContext", () => ({
  useAuthContext: jest.fn()
}));

jest.mock("../../hooks/useFsmDashboardData", () => ({
  useFsmDashboardData: jest.fn()
}));

jest.mock("../../services/fireDrillService", () => ({
  completeFireDrill: jest.fn(),
  createFireDrill: jest.fn(),
  deleteFireDrill: jest.fn(),
  updateScheduledFireDrill: jest.fn()
}));

jest.mock("../../services/storageService", () => ({
  uploadFile: jest.fn()
}));

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

test("conducts the automatically selected scheduled drill without an available-drill selector", () => {
  const today = toDateInputValue(new Date());
  useAuthContext.mockReturnValue({
    user: { uid: "fsm-1", fullName: "FSM User" }
  });
  useFsmDashboardData.mockReturnValue({
    loading: false,
    error: null,
    buildings: [
      { id: "building-1", buildingName: "Pioneer Tech Hub" },
      { id: "building-2", buildingName: "South Tower" }
    ],
    fireDrills: [
      {
        id: "drill-1",
        buildingId: "building-1",
        buildingName: "Pioneer Tech Hub",
        drillDate: today,
        drillTime: "10:00",
        drillEndTime: "10:30",
        drillType: "Fire",
        participants: "210",
        status: "Scheduled"
      },
      {
        id: "drill-2",
        buildingId: "building-2",
        buildingName: "South Tower",
        drillDate: today,
        drillTime: "14:00",
        drillEndTime: "14:30",
        drillType: "Evacuation",
        participants: "80",
        status: "Scheduled"
      }
    ]
  });

  render(<FireDrill />);
  fireEvent.click(screen.getByRole("button", { name: "Conduct Drill" }));

  expect(screen.getByRole("heading", { name: "Conduct Drill" })).toBeInTheDocument();
  expect(screen.queryByText("Available Drill")).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: /available drill/i })).not.toBeInTheDocument();
  expect(screen.getAllByText("Pioneer Tech Hub").length).toBeGreaterThan(0);
  expect(screen.getByText("Planned Participants")).toBeInTheDocument();
});
