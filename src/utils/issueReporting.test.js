import { buildIssuePeriodSnapshot, getMonthBounds } from "./issueReporting";

const issue = {
  id: "issue-1",
  createdAt: new Date("2026-02-10T02:00:00Z"),
  updatedAt: new Date("2026-03-12T02:00:00Z"),
  status: "Resolved",
  history: [
    { status: "Open", updatedAt: new Date("2026-02-10T02:00:00Z") },
    { status: "In Progress", updatedAt: new Date("2026-02-18T02:00:00Z") },
    { status: "Resolved", updatedAt: new Date("2026-03-12T02:00:00Z") }
  ]
};

test("reports historical issue state at each selected month end", () => {
  const february = getMonthBounds(2, 2026);
  const march = getMonthBounds(3, 2026);

  const februarySnapshot = buildIssuePeriodSnapshot([issue], february.start, february.end);
  const marchSnapshot = buildIssuePeriodSnapshot([issue], march.start, march.end);

  expect(februarySnapshot.created).toHaveLength(1);
  expect(februarySnapshot.outstanding).toHaveLength(1);
  expect(februarySnapshot.relevant[0].statusAtEnd).toBe("In Progress");

  expect(marchSnapshot.created).toHaveLength(0);
  expect(marchSnapshot.outstanding).toHaveLength(0);
  expect(marchSnapshot.resolved).toHaveLength(1);
  expect(marchSnapshot.relevant[0].statusAtEnd).toBe("Resolved");
});

test("does not treat a later details or photo update as a new resolution", () => {
  const april = getMonthBounds(4, 2026);
  const updatedIssue = {
    ...issue,
    updatedAt: new Date("2026-04-08T02:00:00Z"),
    history: [
      ...issue.history,
      {
        status: "Resolved",
        eventType: "photos_uploaded",
        updatedAt: new Date("2026-04-08T02:00:00Z")
      }
    ]
  };

  const aprilSnapshot = buildIssuePeriodSnapshot([updatedIssue], april.start, april.end);
  expect(aprilSnapshot.relevant).toHaveLength(0);
  expect(aprilSnapshot.resolved).toHaveLength(0);
});

test("uses the selected inspection month for a backdated issue", () => {
  const february = getMonthBounds(2, 2026);
  const backdatedIssue = {
    ...issue,
    reportedAt: new Date("2026-02-20T04:00:00Z"),
    createdAt: new Date("2026-06-20T04:00:00Z"),
    updatedAt: new Date("2026-06-20T04:00:00Z"),
    status: "Open",
    history: [
      { status: "Open", eventType: "issue_created", updatedAt: new Date("2026-02-20T04:00:00Z") }
    ]
  };

  const snapshot = buildIssuePeriodSnapshot([backdatedIssue], february.start, february.end);
  expect(snapshot.created).toHaveLength(1);
  expect(snapshot.outstanding).toHaveLength(1);
});
