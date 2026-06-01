import React, { useState } from "react";

const mockBuildings = [
  {
    id: "BLD-001",
    buildingName: "Building A",
    address: "123 Main Street, Floor 2",
    occupancyType: "Commercial",
    noOfStoreys: 5,
    grossFloorArea: "45,000 sqm",
    occupantLoad: 500,
    assignedFsm: "John Smith",
    status: "Active",
    statusColor: "#047857",
    statusBg: "#ecfdf5"
  },
  {
    id: "BLD-002",
    buildingName: "Tech Park B",
    address: "456 Tech Avenue",
    occupancyType: "Commercial",
    noOfStoreys: 8,
    grossFloorArea: "75,000 sqm",
    occupantLoad: 800,
    assignedFsm: "John Smith",
    status: "Active",
    statusColor: "#047857",
    statusBg: "#ecfdf5"
  },
  {
    id: "BLD-003",
    buildingName: "Logistics Hub",
    address: "789 Industrial Road",
    occupancyType: "Warehouse",
    noOfStoreys: 3,
    grossFloorArea: "120,000 sqm",
    occupantLoad: 300,
    assignedFsm: "John Smith",
    status: "Active",
    statusColor: "#047857",
    statusBg: "#ecfdf5"
  }
];

const MyBuilding = () => {
  const [buildings] = useState(mockBuildings);

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="card-header-row">
          <h2 className="section-title">Assigned Buildings</h2>
        </div>

        <table className="dashboard-table">
          <thead>
            <tr>
              <th>BUILDING ID</th>
              <th>BUILDING NAME</th>
              <th>ADDRESS</th>
              <th>OCCUPANCY TYPE</th>
              <th>STOREYS</th>
              <th>GFA</th>
              <th>OCCUPANT LOAD</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((building) => (
              <tr key={building.id}>
                <td className="id-cell">{building.id}</td>
                <td style={{ fontWeight: "600" }}>{building.buildingName}</td>
                <td>{building.address}</td>
                <td>{building.occupancyType}</td>
                <td>{building.noOfStoreys}</td>
                <td>{building.grossFloorArea}</td>
                <td>{building.occupantLoad}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: building.statusBg,
                      color: building.statusColor,
                      padding: "4px 12px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}
                  >
                    {building.status}
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

export default MyBuilding;
