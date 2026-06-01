import React, { useState } from "react";

const mockReports = [
  {
    id: "RPT-001",
    reportType: "Monthly FSM Report",
    building: "Building A",
    date: "May 18, 2026",
    status: "Submitted",
    statusColor: "#047857",
    statusBg: "#ecfdf5"
  },
  {
    id: "RPT-002",
    reportType: "Fire Drill Summary",
    building: "Building B",
    date: "May 15, 2026",
    status: "Draft",
    statusColor: "#b45309",
    statusBg: "#fef3c7"
  },
  {
    id: "RPT-003",
    reportType: "Annual Compliance Report",
    building: "Building A",
    date: "May 10, 2026",
    status: "Submitted",
    statusColor: "#047857",
    statusBg: "#ecfdf5"
  }
];

const Reports = () => {
  const [reports] = useState(mockReports);

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="card-header-row">
          <h2 className="section-title">Reports</h2>
          <button type="button" className="view-all-link" style={{ backgroundColor: "#047857", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            + Generate Report
          </button>
        </div>

        <table className="dashboard-table">
          <thead>
            <tr>
              <th>REPORT ID</th>
              <th>REPORT TYPE</th>
              <th>BUILDING</th>
              <th>DATE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="id-cell">{report.id}</td>
                <td>{report.reportType}</td>
                <td>{report.building}</td>
                <td>{report.date}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: report.statusBg,
                      color: report.statusColor,
                      padding: "4px 12px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}
                  >
                    {report.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
