import React, { useState } from "react";

const mockInspections = [
  {
    id: "INS-001",
    building: "Building A",
    inspectionDate: "May 20, 2026",
    checklistStatus: "Completed",
    overallStatus: "Pass",
    statusColor: "#047857",
    statusBg: "#ecfdf5",
    remarks: "All systems operational"
  },
  {
    id: "INS-002",
    building: "Building B",
    inspectionDate: "May 18, 2026",
    checklistStatus: "Pending",
    overallStatus: "Review",
    statusColor: "#b45309",
    statusBg: "#fef3c7",
    remarks: "Zone 3 needs attention"
  },
  {
    id: "INS-003",
    building: "Tech Park B",
    inspectionDate: "May 15, 2026",
    checklistStatus: "Completed",
    overallStatus: "Pass",
    statusColor: "#047857",
    statusBg: "#ecfdf5",
    remarks: "Excellent condition"
  }
];

const Inspections = () => {
  const [inspections] = useState(mockInspections);

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="card-header-row">
          <h2 className="section-title">My Inspections</h2>
          <button type="button" className="view-all-link" style={{ backgroundColor: "#047857", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            + New Inspection
          </button>
        </div>

        <table className="dashboard-table">
          <thead>
            <tr>
              <th>INSPECTION ID</th>
              <th>BUILDING</th>
              <th>DATE</th>
              <th>CHECKLIST STATUS</th>
              <th>OVERALL STATUS</th>
              <th>REMARKS</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((inspection) => (
              <tr key={inspection.id}>
                <td className="id-cell">{inspection.id}</td>
                <td>{inspection.building}</td>
                <td>{inspection.inspectionDate}</td>
                <td>{inspection.checklistStatus}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: inspection.statusBg,
                      color: inspection.statusColor,
                      padding: "4px 12px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}
                  >
                    {inspection.overallStatus}
                  </span>
                </td>
                <td>{inspection.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inspections;
