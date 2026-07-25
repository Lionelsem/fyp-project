import {
  getAnnualFireDrillsForBuildings,
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
