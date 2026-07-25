import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import {
  buildFireDrillAuditRecord,
  completeFireDrill,
  isSubmittedFireDrill
} from "./fireDrillService";

const batch = {
  update: jest.fn(),
  set: jest.fn(),
  commit: jest.fn()
};

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn((_db, collectionName, id) => ({
    path: `${collectionName}/${id}`
  })),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(() => "server-time"),
  updateDoc: jest.fn(),
  writeBatch: jest.fn()
}));

jest.mock("../config/firebase", () => ({
  db: { name: "firestore" }
}));

beforeEach(() => {
  jest.clearAllMocks();
  doc.mockImplementation((_db, collectionName, id) => ({
    path: `${collectionName}/${id}`
  }));
  batch.commit.mockResolvedValue();
  writeBatch.mockReturnValue(batch);
  serverTimestamp.mockReturnValue("server-time");
});

test("builds a submitted Fire Drill audit record for the reporting month", () => {
  const record = buildFireDrillAuditRecord("drill-1", {
    buildingId: "building-1",
    buildingName: "Pioneer Tech Hub",
    fsmId: "fsm-1",
    drillDate: "2026-07-20",
    actualDate: "2026-07-26",
    actualTime: "10:30",
    drillType: "Full evacuation",
    actualParticipants: "120"
  });

  expect(record).toEqual(
    expect.objectContaining({
      id: "fire-drill-drill-1",
      reportId: "FDR-drill-1",
      reportType: "FireDrill",
      fireDrillId: "drill-1",
      buildingId: "building-1",
      generatedBy: "fsm-1",
      reportMonth: 7,
      reportYear: 2026,
      status: "Submitted",
      reportStatus: "Submitted"
    })
  );
});

test("recognises completed historical drills for the audit fallback", () => {
  expect(isSubmittedFireDrill({ status: "Completed" })).toBe(true);
  expect(isSubmittedFireDrill({ reportStatus: "Submitted" })).toBe(true);
  expect(isSubmittedFireDrill({ status: "Scheduled" })).toBe(false);
});

test("completes a Fire Drill and creates its report audit atomically", async () => {
  await completeFireDrill("drill-1", {
    buildingId: "building-1",
    buildingName: "Pioneer Tech Hub",
    fsmId: "fsm-1",
    drillDate: "2026-07-20",
    actualDate: "2026-07-26",
    actualTime: "10:30",
    drillType: "Full evacuation",
    actualParticipants: "120",
    totalEvacuationTime: "04:30"
  });

  expect(doc).toHaveBeenCalledWith(
    { name: "firestore" },
    "fireDrills",
    "drill-1"
  );
  expect(batch.update).toHaveBeenCalledWith(
    { path: "fireDrills/drill-1" },
    expect.objectContaining({
      status: "Completed",
      reportStatus: "Submitted",
      actualDate: "2026-07-26"
    })
  );
  expect(batch.set).toHaveBeenCalledWith(
    { path: "reports/fire-drill-drill-1" },
    expect.objectContaining({
      reportType: "FireDrill",
      fireDrillId: "drill-1",
      buildingId: "building-1",
      reportMonth: 7,
      reportYear: 2026,
      status: "Submitted"
    }),
    { merge: true }
  );
  expect(batch.commit).toHaveBeenCalledTimes(1);
});
