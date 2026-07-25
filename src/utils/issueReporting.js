import { ISSUE_STATUS } from "../constants/status";

const ACTIVE_STATUSES = new Set([
  ISSUE_STATUS.OPEN.toLowerCase(),
  ISSUE_STATUS.IN_PROGRESS.toLowerCase()
]);
const RESOLVED_STATUSES = new Set([
  ISSUE_STATUS.RESOLVED.toLowerCase(),
  ISSUE_STATUS.CLOSED.toLowerCase()
]);

export const parseReportDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeStatus = (status) => String(status || ISSUE_STATUS.OPEN).trim().toLowerCase();

const getStatusEvents = (issue) => {
  const events = (Array.isArray(issue?.history) ? issue.history : [])
    .filter((entry) => !entry.eventType || ["issue_created", "status_update"].includes(entry.eventType))
    .map((entry) => ({
      status: entry.status,
      date: parseReportDate(entry.updatedAt || entry.createdAt)
    }))
    .filter((entry) => entry.status && entry.date);
  const updatedAt = parseReportDate(issue?.updatedAt);

  events.sort((first, second) => first.date - second.date);
  const latestEvent = events[events.length - 1];
  if (
    issue?.status &&
    updatedAt &&
    (!latestEvent || normalizeStatus(latestEvent.status) !== normalizeStatus(issue.status))
  ) {
    events.push({ status: issue.status, date: updatedAt });
  }
  return events.sort((first, second) => first.date - second.date);
};

export const getIssueStatusAt = (issue, asOf) => {
  const asOfDate = parseReportDate(asOf);
  const createdAt = parseReportDate(issue?.reportedAt || issue?.createdAt);
  if (!asOfDate || (createdAt && createdAt > asOfDate)) return null;

  const events = getStatusEvents(issue);
  let status = ISSUE_STATUS.OPEN;
  events.forEach((event) => {
    if (event.date <= asOfDate) status = event.status;
  });

  if (!events.some((event) => event.date <= asOfDate) && issue?.status && !issue?.updatedAt) {
    status = issue.status;
  }
  return status;
};

export const getMonthBounds = (month, year) => ({
  start: new Date(year, month - 1, 1, 0, 0, 0, 0),
  end: new Date(year, month, 0, 23, 59, 59, 999)
});

export const getDateRangeBounds = (dateFrom, dateTo) => ({
  start: new Date(`${dateFrom}T00:00:00`),
  end: new Date(`${dateTo}T23:59:59.999`)
});

export const buildIssuePeriodSnapshot = (issues = [], start, end) => {
  const periodStart = parseReportDate(start);
  const periodEnd = parseReportDate(end);
  if (!periodStart || !periodEnd) {
    return { relevant: [], created: [], outstanding: [], resolved: [] };
  }

  const records = issues.flatMap((issue) => {
    const createdAt = parseReportDate(issue.reportedAt || issue.createdAt);
    if (!createdAt || createdAt > periodEnd) return [];

    const statusAtEnd = getIssueStatusAt(issue, periodEnd) || ISSUE_STATUS.OPEN;
    const createdInPeriod = createdAt >= periodStart && createdAt <= periodEnd;
    const resolvedInPeriod = getStatusEvents(issue).some((event) =>
      event.date >= periodStart &&
      event.date <= periodEnd &&
      RESOLVED_STATUSES.has(normalizeStatus(event.status))
    );
    const outstandingAtEnd = ACTIVE_STATUSES.has(normalizeStatus(statusAtEnd));

    if (!createdInPeriod && !resolvedInPeriod && !outstandingAtEnd) return [];

    const activity = [
      createdInPeriod ? "Created" : null,
      outstandingAtEnd ? "Outstanding at period end" : null,
      resolvedInPeriod ? "Resolved/closed in period" : null
    ].filter(Boolean).join("; ");

    return [{ issue, statusAtEnd, createdInPeriod, outstandingAtEnd, resolvedInPeriod, activity }];
  });

  return {
    relevant: records,
    created: records.filter((record) => record.createdInPeriod),
    outstanding: records.filter((record) => record.outstandingAtEnd),
    resolved: records.filter((record) => record.resolvedInPeriod)
  };
};
