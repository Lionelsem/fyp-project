import { buildFsmNotifications } from "./useFsmNotifications";

const now = new Date(2026, 6, 21, 12, 0, 0);

test("builds reminders for schedules happening within three days", () => {
  const notifications = buildFsmNotifications({
    now,
    buildings: [{ id: "building-1", buildingName: "Harbour Centre" }],
    fireDrills: [{
      id: "drill-1",
      buildingId: "building-1",
      drillDate: "2026-07-24",
      drillTime: "10:00 AM",
      status: "Scheduled"
    }]
  });

  expect(notifications).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: "schedule-fire-drill-drill-1",
      title: "Fire drill in 3 days",
      message: expect.stringContaining("Harbour Centre")
    })
  ]));
});

test("builds submitted, completed, and customer remark notifications", () => {
  const notifications = buildFsmNotifications({
    now,
    inspections: [{ id: "inspection-1", status: "Submitted", updatedAt: now }],
    fireDrills: [{ id: "drill-1", status: "Completed", updatedAt: now }],
    reports: [{
      id: "report-1",
      status: "Submitted",
      reportTitle: "July inspection report",
      customerComments: "Please check the follow-up date.",
      updatedAt: now
    }]
  });

  expect(notifications.map((notification) => notification.title)).toEqual(
    expect.arrayContaining([
      "Inspection submitted",
      "Fire drill completed",
      "July inspection report submitted",
      "New customer remark"
    ])
  );
  expect(notifications).toEqual(expect.arrayContaining([
    expect.objectContaining({
      type: "remark",
      message: "Please check the follow-up date."
    })
  ]));
});

