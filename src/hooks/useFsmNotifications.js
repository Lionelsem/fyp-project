import { useMemo } from "react";
import { useFsmDashboardData } from "./useFsmDashboardData";

const COMPLETED_STATUSES = new Set(["completed", "conducted", "done"]);
const SUBMITTED_STATUSES = new Set(["submitted"]);
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_NOTIFICATIONS = 20;

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);

  const dateOnlyMatch = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    );
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (date) =>
  date?.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }) || "Date to be confirmed";

const formatRelativeTime = (date, now) => {
  if (!date) return "Recently";

  const difference = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(difference / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(date);
};

const getRecordDate = (record) =>
  toDate(
    record.updatedAt ||
      record.completedAt ||
      record.submittedAt ||
      record.createdAt ||
      record.actualDate ||
      record.conductedDate
  );

const getBuildingName = (record, buildingMap) =>
  record.buildingName ||
  record.building_name ||
  buildingMap.get(record.buildingId)?.buildingName ||
  buildingMap.get(record.buildingId)?.building_name ||
  "your assigned building";

const getRecordLabel = (record, fallback) =>
  record.reportTitle ||
  record.inspectionTitle ||
  record.title ||
  record.task ||
  record.drillType ||
  record.reportId ||
  fallback;

const getStartOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const buildFsmNotifications = ({
  buildings = [],
  inspections = [],
  reports = [],
  fireDrills = [],
  now = new Date()
}) => {
  const notifications = [];
  const buildingMap = new Map(buildings.map((building) => [building.id, building]));
  const today = getStartOfDay(now);

  fireDrills.forEach((drill) => {
    const statuses = [drill.status, drill.performanceStatus, drill.reportStatus].map(normalizeText);
    const isFinished = statuses.some(
      (status) => COMPLETED_STATUSES.has(status) || SUBMITTED_STATUSES.has(status)
    ) || Boolean(drill.completedAt || drill.actualDate || drill.conductedDate);
    const scheduledDate = toDate(drill.drillDate);

    if (scheduledDate && !isFinished) {
      const daysUntil = Math.round((getStartOfDay(scheduledDate) - today) / DAY_IN_MS);
      if (daysUntil >= 0 && daysUntil <= 3) {
        const timing = daysUntil === 0
          ? "today"
          : daysUntil === 1
            ? "tomorrow"
            : `in ${daysUntil} days`;
        const buildingName = getBuildingName(drill, buildingMap);
        notifications.push({
          id: `schedule-fire-drill-${drill.id}`,
          type: "schedule",
          title: `Fire drill ${timing}`,
          message: `${buildingName} · ${formatDate(scheduledDate)}${drill.drillTime ? ` at ${drill.drillTime}` : ""}`,
          time: "Upcoming schedule",
          isRead: false,
          sortDate: now
        });
      }
    }
  });

  const addStatusNotification = (record, entityType, fallbackLabel) => {
    const statuses = [record.status, record.performanceStatus, record.reportStatus].map(normalizeText);
    const isCompleted = statuses.some((status) => COMPLETED_STATUSES.has(status));
    const isSubmitted = statuses.some((status) => SUBMITTED_STATUSES.has(status));
    if (!isCompleted && !isSubmitted) return;

    const displayStatus = isCompleted ? "completed" : "submitted";
    const eventDate = getRecordDate(record);
    const label = getRecordLabel(record, fallbackLabel);
    const buildingName = getBuildingName(record, buildingMap);
    notifications.push({
      id: `${entityType}-${displayStatus}-${record.id}`,
      type: "status",
      title: `${label} ${displayStatus}`,
      message: buildingName,
      time: formatRelativeTime(eventDate, now),
      isRead: false,
      sortDate: eventDate || new Date(0)
    });
  };

  inspections.forEach((inspection) =>
    addStatusNotification(inspection, "inspection", "Inspection")
  );
  reports.forEach((report) => addStatusNotification(report, "report", "Report"));
  fireDrills.forEach((drill) => addStatusNotification(drill, "fire-drill", "Fire drill"));

  [...reports, ...fireDrills].forEach((record) => {
    const remark = String(record.customerComments || "").trim();
    if (!remark) return;

    const eventDate = getRecordDate(record);
    const entityType = reports.includes(record) ? "report" : "fire-drill";
    notifications.push({
      id: `customer-remark-${entityType}-${record.id}-${remark}`,
      type: "remark",
      title: "New customer remark",
      message: remark,
      time: formatRelativeTime(eventDate, now),
      isRead: false,
      sortDate: eventDate || new Date(0)
    });
  });

  return notifications
    .sort((first, second) => second.sortDate.getTime() - first.sortDate.getTime())
    .slice(0, MAX_NOTIFICATIONS)
    .map(({ sortDate, ...notification }) => notification);
};

const getFsmLookupIds = (user) => [
  user?.uid,
  user?.authUid,
  user?.profileId,
  user?.id,
  user?.userId,
  user?.fullName,
  user?.displayName,
  user?.fsmId,
  user?.assignedFsmId,
  user?.staffId,
  user?.employeeId,
  user?.accountId,
  user?.firestoreId
];

export const useFsmNotifications = (user) => {
  const lookupIds = useMemo(() => getFsmLookupIds(user), [user]);
  const { buildings, inspections, reports, fireDrills } = useFsmDashboardData(lookupIds);

  return useMemo(
    () => buildFsmNotifications({ buildings, inspections, reports, fireDrills }),
    [buildings, fireDrills, inspections, reports]
  );
};
