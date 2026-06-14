import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";
import { ISSUE_STATUS, PRIORITY } from "../constants/status";

const IN_QUERY_CHUNK_SIZE = 10;

const EMPTY_DATA = {
  buildings: [],
  inspections: [],
  reports: [],
  fireDrills: [],
  issues: []
};

const EMPTY_LOADED = {
  buildings: true,
  inspections: true,
  reports: true,
  fireDrills: true,
  issues: true
};

const PENDING_LOADED = {
  buildings: false,
  inspections: false,
  reports: false,
  fireDrills: false,
  issues: false
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const normalizeLookupIds = (value) => {
  const values = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      values
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
};

const mapSnapshot = (snapshot) =>
  snapshot.docs.map((docItem) => ({
    ...docItem.data(),
    id: docItem.id
  }));

const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const uniqueById = (items) => {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  const text = String(value).trim();
  const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    );
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = toDate(value);
  if (!date) return "-";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const formatTime = (value) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const date = toDate(value);
  if (!date) return "Time TBC";

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
};

const parseTimeParts = (value) => {
  if (!value) return null;

  const date = toDate(value);
  if (date && !(typeof value === "string" && /^\d{1,2}:\d{2}/.test(value))) {
    return { hours: date.getHours(), minutes: date.getMinutes() };
  }

  const text = String(value).trim();
  const meridiemMatch = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (meridiemMatch) {
    let hours = Number(meridiemMatch[1]);
    const minutes = Number(meridiemMatch[2]);
    const meridiem = meridiemMatch[3].toUpperCase();

    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    return { hours, minutes };
  }

  const twentyFourHourMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    return {
      hours: Number(twentyFourHourMatch[1]),
      minutes: Number(twentyFourHourMatch[2])
    };
  }

  const parsedDate = toDate(text);
  if (!parsedDate) return null;

  return { hours: parsedDate.getHours(), minutes: parsedDate.getMinutes() };
};

const combineDateAndTime = (dateValue, timeValue) => {
  const date = toDate(dateValue);
  if (!date) return null;

  const combined = new Date(date);
  const timeParts = parseTimeParts(timeValue);

  if (timeParts) {
    combined.setHours(timeParts.hours, timeParts.minutes, 0, 0);
  }

  return combined;
};

const hasTimeComponent = (date) =>
  date.getHours() !== 0 ||
  date.getMinutes() !== 0 ||
  date.getSeconds() !== 0 ||
  date.getMilliseconds() !== 0;

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const buildLastFiveMonths = () => {
  const months = [];
  const now = new Date();

  for (let offset = 4; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({
      key: getMonthKey(date),
      month: date.toLocaleString(undefined, { month: "short" }),
      passed: 0,
      pending: 0,
      failed: 0
    });
  }

  return months;
};

const getInspectionBucket = (inspection) => {
  const status = normalizeText(inspection.status || "");
  const progress = Number(inspection.progressPercent || 0);

  if (["pass", "passed", "completed", "submitted", "approved"].includes(status)) return "passed";
  if (status === "fail" || status === "failed") return "failed";
  if (status === "pending" || status === "review" || status === "draft" || progress < 100) return "pending";

  return "pending";
};

const getInspectionStatus = (inspection) => normalizeText(inspection.status || "draft");

const isPendingInspection = (inspection) => {
  const status = getInspectionStatus(inspection);
  const progress = Number(inspection.progressPercent || 0);

  if (["completed", "submitted", "approved", "pass", "passed", "failed"].includes(status)) {
    return false;
  }

  return ["pending", "review", "draft", "in progress"].includes(status) || progress < 100;
};

const isCompletedInspection = (inspection) => {
  const status = getInspectionStatus(inspection);
  return ["completed", "submitted", "approved", "pass", "passed"].includes(status);
};

const getStatusStyle = (status) => {
  const normalized = normalizeText(status);

  if (
    ["pass", "passed", "completed", "submitted", "approved", "resolved", "closed"].includes(
      normalized
    )
  ) {
    return { statusColor: "#047857", statusBg: "#ecfdf5" };
  }

  if (["fail", "failed", "open", "critical", "high"].includes(normalized)) {
    return { statusColor: "#dc2626", statusBg: "#fee2e2" };
  }

  if (["pending", "review", "draft", "in progress"].includes(normalized)) {
    return { statusColor: "#b45309", statusBg: "#fef3c7" };
  }

  return { statusColor: "#475569", statusBg: "#f1f5f9" };
};

const getPriorityColor = (priority) => {
  const normalized = normalizeText(priority);
  if (normalized === "critical" || normalized === normalizeText(PRIORITY.HIGH)) {
    return "#dc2626";
  }
  if (normalized === normalizeText(PRIORITY.MEDIUM)) {
    return "#b45309";
  }
  return "#666";
};

const isCompletedFireDrill = (drill) => {
  const status = normalizeText(drill.status);
  const performanceStatus = normalizeText(drill.performanceStatus);

  return (
    ["completed", "conducted", "done", "submitted"].includes(status) ||
    ["completed", "conducted", "done", "submitted"].includes(performanceStatus) ||
    Boolean(drill.completedAt || drill.actualDate || drill.conductedDate)
  );
};

const normalizeFieldName = (fieldName) =>
  String(fieldName || "")
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const getFirstTextValue = (source, fieldNames) => {
  if (!source) return "";

  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  const normalizedFieldNames = new Set(fieldNames.map(normalizeFieldName));
  const matchingEntry = Object.entries(source).find(([key, value]) => (
    normalizedFieldNames.has(normalizeFieldName(key)) &&
    value !== undefined &&
    value !== null &&
    String(value).trim()
  ));

  if (matchingEntry) {
    return String(matchingEntry[1]).trim();
  }

  return "";
};

const BUILDING_NAME_FIELDS = [
  "building_name",
  "buildingName",
  "BuildingName",
  "building name",
  "Building Name",
  "name",
  "Name",
  "building",
  "Building"
];

const getBuildingName = (buildingMap, buildingId, fallback) => {
  const building = buildingMap.get(buildingId);
  return (
    getFirstTextValue(building, BUILDING_NAME_FIELDS) ||
    fallback ||
    "Unknown Building"
  );
};

const buildSummaryCards = (inspections, issues) => {
  const pendingCount = inspections.filter(isPendingInspection).length;
  const completedCount = inspections.filter(isCompletedInspection).length;
  const urgentIssueCount = issues.filter((issue) => {
    const priority = normalizeText(issue.priority);
    const status = normalizeText(issue.status);
    const isUrgent =
      priority === normalizeText(PRIORITY.HIGH) || priority === "critical";
    const isClosed =
      status === normalizeText(ISSUE_STATUS.RESOLVED) ||
      status === normalizeText(ISSUE_STATUS.CLOSED);

    return isUrgent && !isClosed;
  }).length;

  return [
    {
      label: "Total Inspections",
      value: inspections.length,
      icon: "\uD83D\uDCCB",
      iconBg: "#ecfdf5",
      iconColor: "#047857",
      trend: "Live from Firestore"
    },
    {
      label: "Pending",
      value: pendingCount,
      icon: "\u23F3",
      iconBg: "#fef3c7",
      iconColor: "#b45309",
      trend: `${pendingCount} awaiting action`
    },
    {
      label: "Completed",
      value: completedCount,
      icon: "\u2705",
      iconBg: "#dbeafe",
      iconColor: "#0284c7",
      trend: "Completed inspections"
    },
    {
      label: "Urgent Issues",
      value: urgentIssueCount,
      icon: "\uD83D\uDEA8",
      iconBg: "#fee2e2",
      iconColor: "#dc2626",
      trend: "Requires immediate action"
    }
  ];
};

const buildStatusBreakdown = (inspections) =>
  inspections.reduce(
    (breakdown, inspection) => {
      const bucket = getInspectionBucket(inspection);
      return {
        ...breakdown,
        total: breakdown.total + 1,
        [bucket]: breakdown[bucket] + 1
      };
    },
    { total: 0, passed: 0, pending: 0, failed: 0 }
  );

const buildMonthlyTrend = (inspections) => {
  const months = buildLastFiveMonths();
  const monthMap = new Map(months.map((month) => [month.key, month]));

  inspections.forEach((inspection) => {
    const date = toDate(inspection.inspectionDate || inspection.createdAt);
    if (!date) return;

    const month = monthMap.get(getMonthKey(date));
    if (!month) return;

    month[getInspectionBucket(inspection)] += 1;
  });

  return months;
};

const buildRecentReports = (reports, buildingMap) =>
  [...reports]
    .sort((first, second) => {
      const firstDate = toDate(first.generatedDate || first.createdAt);
      const secondDate = toDate(second.generatedDate || second.createdAt);
      return (secondDate?.getTime() || 0) - (firstDate?.getTime() || 0);
    })
    .slice(0, 2)
    .map((report) => {
      const status = report.status || report.reportStatus || "Draft";
      const priority = report.priority || "Normal";

      return {
        id: report.id,
        building: getBuildingName(
          buildingMap,
          report.buildingId,
          report.building
        ),
        date: formatDate(report.generatedDate || report.createdAt || report.date),
        status,
        priority,
        priorityColor: getPriorityColor(priority),
        ...getStatusStyle(status)
      };
    });

const buildUpcomingSchedule = (fireDrills, buildingMap) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  return fireDrills
    .filter((drill) => !isCompletedFireDrill(drill))
    .map((drill) => {
      const dateTime = combineDateAndTime(drill.drillDate, drill.drillTime);
      return {
        drill,
        dateTime,
        hasExplicitTime:
          Boolean(drill.drillTime) ||
          (dateTime ? hasTimeComponent(dateTime) : false)
      };
    })
    .filter(({ dateTime, hasExplicitTime }) => {
      if (!dateTime) return false;
      return hasExplicitTime ? dateTime >= now : dateTime >= todayStart;
    })
    .sort((first, second) => first.dateTime - second.dateTime)
    .slice(0, 2)
    .map(({ drill, dateTime }) => ({
      id: drill.id,
      time: drill.drillTime
        ? formatTime(drill.drillTime)
        : hasTimeComponent(dateTime)
          ? formatTime(dateTime)
          : "Time TBC",
      date: formatDate(dateTime),
      task: drill.task || drill.drillType || "Fire Drill",
      building: getBuildingName(
        buildingMap,
        drill.buildingId,
        drill.buildingName
      )
    }));
};

export const useFsmDashboardData = (fsmLookupValue) => {
  const [data, setData] = useState(EMPTY_DATA);
  const [loaded, setLoaded] = useState(EMPTY_LOADED);
  const [error, setError] = useState(null);
  const fsmLookupIds = useMemo(
    () => normalizeLookupIds(fsmLookupValue),
    [fsmLookupValue]
  );
  const fsmLookupIdsKey = useMemo(
    () => JSON.stringify(fsmLookupIds),
    [fsmLookupIds]
  );

  useEffect(() => {
    const lookupIds = JSON.parse(fsmLookupIdsKey);

    if (lookupIds.length === 0) {
      setData(EMPTY_DATA);
      setLoaded(EMPTY_LOADED);
      setError(null);
      return undefined;
    }

    let active = true;
    setData(EMPTY_DATA);
    setLoaded(PENDING_LOADED);
    setError(null);

    const markLoaded = (source) => {
      if (!active) return;
      setLoaded((current) => ({ ...current, [source]: true }));
    };

    const handleError = (source, listenerError) => {
      if (!active) return;
      console.error(`FSM dashboard ${source} listener failed`, listenerError);
      setError(listenerError.message || "Could not sync dashboard data.");
      markLoaded(source);
    };

    const listenByField = (source, collectionName, fieldName) => {
      const chunks = chunkArray(lookupIds, IN_QUERY_CHUNK_SIZE);
      const chunkResults = chunks.map(() => []);
      const chunkLoaded = chunks.map(() => false);

      const updateSource = () => {
        if (!active) return;
        setData((current) => ({
          ...current,
          [source]: uniqueById(chunkResults.flat())
        }));

        if (chunkLoaded.every(Boolean)) {
          markLoaded(source);
        }
      };

      return chunks.map((ids, index) =>
        onSnapshot(
          query(
            collection(db, collectionName),
            ids.length === 1
              ? where(fieldName, "==", ids[0])
              : where(fieldName, "in", ids)
          ),
          (snapshot) => {
            if (!active) return;
            chunkResults[index] = mapSnapshot(snapshot);
            chunkLoaded[index] = true;
            updateSource();
          },
          (listenerError) => {
            chunkLoaded[index] = true;
            handleError(source, listenerError);
            updateSource();
          }
        )
      );
    };

    const unsubscribes = [
      ...listenByField(
        "buildings",
        COLLECTION_NAMES.BUILDINGS,
        "assignedFsmId"
      ),
      ...listenByField(
        "inspections",
        COLLECTION_NAMES.INSPECTIONS,
        "fsmId"
      ),
      ...listenByField(
        "reports",
        COLLECTION_NAMES.REPORTS,
        "generatedBy"
      ),
      ...listenByField(
        "fireDrills",
        COLLECTION_NAMES.FIRE_DRILLS,
        "fsmId"
      )
    ];

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [fsmLookupIdsKey]);

  const buildingIds = useMemo(
    () => uniqueById(data.buildings).map((building) => building.id),
    [data.buildings]
  );
  const buildingIdsKey = useMemo(() => JSON.stringify(buildingIds), [buildingIds]);

  useEffect(() => {
    const lookupIds = JSON.parse(fsmLookupIdsKey);

    if (lookupIds.length === 0 || !loaded.buildings) return undefined;

    const assignedBuildingIds = JSON.parse(buildingIdsKey);

    if (assignedBuildingIds.length === 0) {
      setData((current) => ({ ...current, issues: [] }));
      setLoaded((current) => ({ ...current, issues: true }));
      return undefined;
    }

    let active = true;
    const chunks = chunkArray(assignedBuildingIds, IN_QUERY_CHUNK_SIZE);
    const chunkResults = chunks.map(() => []);
    const chunkLoaded = chunks.map(() => false);

    setLoaded((current) => ({ ...current, issues: false }));

    const updateIssues = () => {
      if (!active) return;

      setData((current) => ({
        ...current,
        issues: uniqueById(chunkResults.flat())
      }));

      if (chunkLoaded.every(Boolean)) {
        setLoaded((current) => ({ ...current, issues: true }));
      }
    };

    const unsubscribes = chunks.map((ids, index) =>
      onSnapshot(
        query(
          collection(db, COLLECTION_NAMES.ISSUES),
          where("buildingId", "in", ids)
        ),
        (snapshot) => {
          if (!active) return;
          chunkResults[index] = mapSnapshot(snapshot);
          chunkLoaded[index] = true;
          updateIssues();
        },
        (listenerError) => {
          if (!active) return;
          console.error("FSM dashboard issues listener failed", listenerError);
          setError(listenerError.message || "Could not sync dashboard issues.");
          chunkLoaded[index] = true;
          updateIssues();
        }
      )
    );

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [buildingIdsKey, fsmLookupIdsKey, loaded.buildings]);

  const buildingMap = useMemo(
    () => new Map(data.buildings.map((building) => [building.id, building])),
    [data.buildings]
  );

  const summaryCards = useMemo(
    () => buildSummaryCards(data.inspections, data.issues),
    [data.inspections, data.issues]
  );

  const statusBreakdown = useMemo(
    () => buildStatusBreakdown(data.inspections),
    [data.inspections]
  );

  const monthlyTrend = useMemo(
    () => buildMonthlyTrend(data.inspections),
    [data.inspections]
  );

  const recentReports = useMemo(
    () => buildRecentReports(data.reports, buildingMap),
    [data.reports, buildingMap]
  );

  const upcomingSchedule = useMemo(
    () => buildUpcomingSchedule(data.fireDrills, buildingMap),
    [data.fireDrills, buildingMap]
  );

  const loading = useMemo(
    () => Object.values(loaded).some((sourceLoaded) => !sourceLoaded),
    [loaded]
  );

  return {
    loading,
    error,
    buildings: data.buildings,
    inspections: data.inspections,
    reports: data.reports,
    fireDrills: data.fireDrills,
    issues: data.issues,
    summaryCards,
    statusBreakdown,
    monthlyTrend,
    recentReports,
    upcomingSchedule
  };
};
