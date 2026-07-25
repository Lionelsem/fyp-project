import {
  getAnnualReportParties,
  getAnnualFireDrillsForBuildings,
  getFireDrillPhotoCaption,
  getFireDrillPhotoUrls,
  getMonthlyFireDrillsForBuildings
} from "./reportGeneratorService";

const northTower = { id: "building-1", buildingId: "BLD-001" };
const southTower = { id: "building-2", buildingId: "BLD-002" };

test("places a completed drill in the month it was conducted, not the month it was scheduled", () => {
  const drill = {
    id: "drill-1",
    buildingId: "building-1",
    drillDate: "2026-05-28",
    actualDate: "2026-06-03",
    status: "Completed"
  };

  expect(getMonthlyFireDrillsForBuildings([drill], 6, 2026, [northTower])).toEqual([drill]);
  expect(getMonthlyFireDrillsForBuildings([drill], 5, 2026, [northTower])).toEqual([]);
});

test("excludes scheduled drills and drills belonging to another building", () => {
  const scheduled = {
    id: "scheduled",
    buildingId: "building-1",
    drillDate: "2026-06-10",
    status: "Scheduled"
  };
  const otherBuilding = {
    id: "other",
    buildingId: "building-2",
    actualDate: "2026-06-12",
    status: "Completed"
  };

  expect(
    getMonthlyFireDrillsForBuildings(
      [scheduled, otherBuilding],
      6,
      2026,
      [northTower]
    )
  ).toEqual([]);
  expect(getAnnualFireDrillsForBuildings([otherBuilding], 2026, [southTower]))
    .toEqual([otherBuilding]);
});

test("collects and deduplicates fire drill photograph URLs", () => {
  expect(getFireDrillPhotoUrls({
    photoUrls: ["https://example.com/one.jpg"],
    photos: [
      { url: "https://example.com/one.jpg" },
      { downloadURL: "https://example.com/two.png" }
    ],
    photoUrl: "https://example.com/three.jpg"
  })).toEqual([
    "https://example.com/one.jpg",
    "https://example.com/two.png",
    "https://example.com/three.jpg"
  ]);
});

test("uses the uploaded fire drill photograph caption in the annual report", () => {
  expect(getFireDrillPhotoCaption({
    photos: [{
      url: "https://example.com/assembly-area.jpg",
      caption: "Occupants assembled at the designated assembly area"
    }]
  }, 0)).toBe("Occupants assembled at the designated assembly area");
});

test("resolves the assigned building owner and FSM for an annual report", () => {
  const building = {
    customerId: "customer-1",
    assignedFsmId: "fsm-1"
  };
  const users = [
    {
      uid: "customer-1",
      fullName: "Building Owner",
      email: "owner@example.com",
      phoneNumber: "61234567"
    },
    {
      uid: "fsm-1",
      firstName: "Amanda",
      lastName: "Chong",
      email: "amanda@example.com",
      phoneNumber: "91234567"
    }
  ];

  expect(getAnnualReportParties(building, users, "Admin User")).toEqual({
    owner: {
      name: "Building Owner",
      email: "owner@example.com",
      contactNumber: "61234567"
    },
    fsm: {
      name: "Amanda Chong",
      email: "amanda@example.com",
      contactNumber: "91234567"
    }
  });
});
