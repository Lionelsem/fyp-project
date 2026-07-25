import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminReports from "./Reports";
import { useAuth } from "../../hooks/useAuth";
import { getAllBuildings } from "../../services/buildingService";
import { getAllFireDrills } from "../../services/fireDrillService";
import { getIssues } from "../../services/issueService";
import {
  createReport,
  getAllInspectionResults,
  getAllInspections,
  getAllReports
} from "../../services/reportService";
import { generateAnnualReport } from "../../services/reportGeneratorService";
import { getAllUsers } from "../../services/userService";

jest.mock("../../hooks/useAuth", () => ({ useAuth: jest.fn() }));
jest.mock("../../services/buildingService", () => ({ getAllBuildings: jest.fn() }));
jest.mock("../../services/fireDrillService", () => ({ getAllFireDrills: jest.fn() }));
jest.mock("../../services/issueService", () => ({ getIssues: jest.fn() }));
jest.mock("../../services/reportService", () => ({
  createReport: jest.fn(),
  getAllInspectionResults: jest.fn(),
  getAllInspections: jest.fn(),
  getAllReports: jest.fn()
}));
jest.mock("../../services/reportGeneratorService", () => ({
  generateAnnualReport: jest.fn(),
  generateCustomReport: jest.fn(),
  generateMonthlyReport: jest.fn(),
  generateMonthlyReportPdf: jest.fn()
}));
jest.mock("../../services/userService", () => ({ getAllUsers: jest.fn() }));

const buildings = [
  { id: "building-1", buildingName: "North Tower" },
  { id: "building-2", buildingName: "South Tower" }
];

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { uid: "admin-1", fullName: "Admin User" } });
  getAllReports.mockResolvedValue([]);
  getAllBuildings.mockResolvedValue(buildings);
  getAllUsers.mockResolvedValue([]);
  getAllFireDrills.mockResolvedValue([]);
  getAllInspections.mockResolvedValue([]);
  getAllInspectionResults.mockResolvedValue([]);
  getIssues.mockResolvedValue([]);
  generateAnnualReport.mockResolvedValue(undefined);
  createReport.mockResolvedValue({ id: "report-1" });
});

test("generates an annual report for only the selected building", async () => {
  render(<AdminReports />);

  fireEvent.click(screen.getByRole("button", { name: "Generate Annual Report" }));
  const buildingSelect = await screen.findByLabelText("Building");
  await screen.findByRole("option", { name: "South Tower" });
  await userEvent.selectOptions(buildingSelect, "building-2");
  expect(buildingSelect).toHaveValue("building-2");
  const generateButton = screen.getByRole("button", { name: "Generate & Download" });
  fireEvent.click(generateButton);

  await waitFor(() => {
    expect(generateAnnualReport).toHaveBeenCalledWith(expect.objectContaining({
      buildings: [{ id: "building-2", buildingName: "South Tower" }]
    }));
  });

  expect(createReport).toHaveBeenCalledWith(expect.objectContaining({
    reportType: "Annual",
    buildingId: "building-2",
    reportTitle: expect.stringContaining("South Tower")
  }));
});
