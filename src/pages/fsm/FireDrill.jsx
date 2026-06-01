import React, { useState } from "react";

const mockFireDrills = [
  {
    id: "FD-001",
    buildingName: "Building A",
    drillDate: "May 20, 2026",
    evacuationTime: "4m 12s",
    result: "Pass",
    resultBg: "#dcfce7",
    resultColor: "#166534",
    observations: "All areas evacuated successfully"
  },
  {
    id: "FD-002",
    buildingName: "Building B",
    drillDate: "May 18, 2026",
    evacuationTime: "6m 45s",
    result: "Review",
    resultBg: "#fef3c7",
    resultColor: "#b45309",
    observations: "Zone 3 evacuation slower than expected"
  },
  {
    id: "FD-003",
    buildingName: "Building C",
    drillDate: "May 15, 2026",
    evacuationTime: "3m 50s",
    result: "Pass",
    resultBg: "#dcfce7",
    resultColor: "#166534",
    observations: "Excellent performance"
  }
];

const FireDrill = () => {
  const [drills] = useState(mockFireDrills);

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="card-header-row">
          <h2 className="section-title">Fire Drill Records</h2>
          <button type="button" className="view-all-link" style={{ backgroundColor: "#047857", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            + Schedule New Drill
          </button>
        </div>

        <table className="dashboard-table">
          <thead>
            <tr>
              <th>DRILL ID</th>
              <th>BUILDING</th>
              <th>DATE</th>
              <th>EVACUATION TIME</th>
              <th>RESULT</th>
              <th>OBSERVATIONS</th>
            </tr>
          </thead>
          <tbody>
            {drills.map((drill) => (
              <tr key={drill.id}>
                <td className="id-cell">{drill.id}</td>
                <td>{drill.buildingName}</td>
                <td>{drill.drillDate}</td>
                <td style={{ fontWeight: "600" }}>{drill.evacuationTime}</td>
                <td>
                  <span
                    className="result-badge"
                    style={{
                      backgroundColor: drill.resultBg,
                      color: drill.resultColor,
                      padding: "4px 12px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}
                  >
                    {drill.result}
                  </span>
                </td>
                <td>{drill.observations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FireDrill;
