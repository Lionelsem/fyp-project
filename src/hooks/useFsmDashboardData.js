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
  buildingReports: [],
  fireDrills: [],
  fsmFireDrills: [],
  buildingFireDrills: [],
  issues: []
};

const EMPTY_LOADED = {
  buildings: true,
  inspections: true,
  reports: true,
  buildingReports: true,
  fireDrills: true,
  fsmFireDrills: true,
  buildingFireDrills: true,
  issues: true
};

const PENDING_LOADED = {
  buildings: false,
  inspections: false,
  reports: false,
  buildingReports: false,
  fireDrills: true,
  fsmFireDrills: false,
  buildingFireDrills: false,
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

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const formatTime = (value) => {
  if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    const timeMatch = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);

    if (!timeMatch) return text;

    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const meridiem = timeMatch[3]?.toUpperCase();

    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    const displayHour = String(((hours + 11) % 12) + 1).padStart(2, "0");
    return `${displayHour}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
  }

  const date = toDate(value);
  if (!date) return "Time TBC";

  const displayHour = String(((date.getHours() + 11) % 12) + 1).padStart(2, "0");
  return `${displayHour}:${String(date.getMinutes()).padStart(2, "0")} ${date.getHours() >= 12 ? "PM" : "AM"}`;
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

const getIssueBucket = (issue) => {
  const priority = normalizeText(issue.priority);
  const status = normalizeText(issue.status);

  if (status === normalizeText(ISSUE_STATUS.CLOSED) || status === "completed") {
    return "completed";
  }
  if (status === normalizeText(ISSUE_STATUS.RESOLVED)) return "resolved";
  if (priority === normalizeText(PRIORITY.HIGH) || priority === "critical") {
    return "critical";
  }
  return "inProgress";
};

const getIssueDate = (issue) =>
  toDate(
    issue.reportedAt ||
    issue.createdAt ||
    issue.inspectionDate ||
    issue.updatedAt ||
    issue.fixPhotoUploadedAt ||
    issue.defectPhotoUploadedAt
  );

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

const normalizeDashboardStatus = (status) => {
  const displayStatus = String(status || "").trim();
  const normalized = normalizeText(displayStatus);

  if (
    normalized === normalizeText(ISSUE_STATUS.CLOSED) ||
    normalized === normalizeText(ISSUE_STATUS.RESOLVED)
  ) {
    return "Resolved";
  }

  if (normalized === normalizeText(ISSUE_STATUS.IN_PROGRESS)) {
    return "In Progress";
  }

  if (normalized === normalizeText(ISSUE_STATUS.OPEN)) return "Open";
  if (normalized === normalizeText(ISSUE_STATUS.DRAFT)) return "Draft";
  if (normalized === normalizeText("Submitted")) return "Submitted";

  return displayStatus || "Submitted";
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

const getPriorityBackground = (priority) => {
  const normalized = normalizeText(priority);
  if (normalized === "critical" || normalized === normalizeText(PRIORITY.HIGH)) {
    return "#fee2e2";
  }
  if (normalized === normalizeText(PRIORITY.MEDIUM)) {
    return "#fef3c7";
  }
  if (normalized === normalizeText(PRIORITY.LOW)) {
    return "#dbeafe";
  }
  return "#f1f5f9";
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

const buildStatusBreakdown = (issues) =>
  issues.reduce(
    (breakdown, issue) => {
      const bucket = getIssueBucket(issue);
      return {
        ...breakdown,
        total: breakdown.total + 1,
        [bucket]: breakdown[bucket] + 1
      };
    },
    { total: 0, completed: 0, resolved: 0, inProgress: 0, critical: 0 }
  );

const buildMonthlyTrend = (issues) => {
  const monthMap = new Map();

  issues.forEach((issue) => {
    const date = getIssueDate(issue);
    if (!date) return;

    const key = getMonthKey(date);
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        key,
        month: date.toLocaleString(undefined, { month: "short", year: "numeric" }),
        sortDate: new Date(date.getFullYear(), date.getMonth(), 1),
        completed: 0,
        resolved: 0,
        inProgress: 0,
        critical: 0
      });
    }

    monthMap.get(key)[getIssueBucket(issue)] += 1;
  });

  return Array.from(monthMap.values())
    .sort((first, second) => first.sortDate - second.sortDate)
    .map(({ sortDate, ...month }) => month);
};

const buildRecentReports = (issues, buildingMap) =>
  [...issues]
    .sort((first, second) => {
      const firstDate = getIssueDate(first);
      const secondDate = getIssueDate(second);
      return (secondDate?.getTime() || 0) - (firstDate?.getTime() || 0);
    })
    .slice(0, 5)
    .map((issue) => {
      const status = normalizeDashboardStatus(issue.status);
      const priority = issue.priority || "Normal";

      return {
        id: issue.id,
        building: getBuildingName(
          buildingMap,
          issue.buildingId,
          issue.buildingName
        ),
        issue: issue.issueTitle || issue.issueDescription || "Untitled issue",
        date: formatDate(getIssueDate(issue)),
        status,
        priority,
        priorityColor: getPriorityColor(priority),
        priorityBg: getPriorityBackground(priority),
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
    .slice(0, 3)
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
        "fsmFireDrills",
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
          // eslint-disable-next-line no-console
          console.log("FSM dashboard issues listener snapshot", {
            buildingIds: ids,
            issueCount: snapshot.size
          });
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

  useEffect(() => {
    const lookupIds = JSON.parse(fsmLookupIdsKey);

    if (lookupIds.length === 0 || !loaded.buildings) return undefined;

    const assignedBuildingIds = JSON.parse(buildingIdsKey);

    if (assignedBuildingIds.length === 0) {
      setData((current) => ({ ...current, buildingReports: [] }));
      setLoaded((current) => ({ ...current, buildingReports: true }));
      return undefined;
    }

    let active = true;
    const chunks = chunkArray(assignedBuildingIds, IN_QUERY_CHUNK_SIZE);
    const chunkResults = chunks.map(() => []);
    const chunkLoaded = chunks.map(() => false);

    setLoaded((current) => ({ ...current, buildingReports: false }));

    const updateReports = () => {
      if (!active) return;
      setData((current) => ({
        ...current,
        buildingReports: uniqueById(chunkResults.flat())
      }));
      if (chunkLoaded.every(Boolean)) {
        setLoaded((current) => ({ ...current, buildingReports: true }));
      }
    };

    const unsubscribes = chunks.map((ids, index) =>
      onSnapshot(
        query(
          collection(db, COLLECTION_NAMES.REPORTS),
          where("buildingId", "in", ids)
        ),
        (snapshot) => {
          if (!active) return;
          chunkResults[index] = mapSnapshot(snapshot);
          chunkLoaded[index] = true;
          updateReports();
        },
        (listenerError) => {
          if (!active) return;
          console.error("FSM dashboard building reports listener failed", listenerError);
          setError(listenerError.message || "Could not sync building reports.");
          chunkLoaded[index] = true;
          updateReports();
        }
      )
    );

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [buildingIdsKey, fsmLookupIdsKey, loaded.buildings]);

  useEffect(() => {
    const lookupIds = JSON.parse(fsmLookupIdsKey);

    if (lookupIds.length === 0 || !loaded.buildings) return undefined;

    const assignedBuildingIds = JSON.parse(buildingIdsKey);

    if (assignedBuildingIds.length === 0) {
      setData((current) => ({ ...current, buildingFireDrills: [] }));
      setLoaded((current) => ({ ...current, buildingFireDrills: true }));
      return undefined;
    }

    let active = true;
    const chunks = chunkArray(assignedBuildingIds, IN_QUERY_CHUNK_SIZE);
    const chunkResults = chunks.map(() => []);
    const chunkLoaded = chunks.map(() => false);

    setLoaded((current) => ({ ...current, buildingFireDrills: false }));

    const updateFireDrills = () => {
      if (!active) return;

      setData((current) => ({
        ...current,
        buildingFireDrills: uniqueById(chunkResults.flat())
      }));

      if (chunkLoaded.every(Boolean)) {
        setLoaded((current) => ({ ...current, buildingFireDrills: true }));
      }
    };

    const unsubscribes = chunks.map((ids, index) =>
      onSnapshot(
        query(
          collection(db, COLLECTION_NAMES.FIRE_DRILLS),
          where("buildingId", "in", ids)
        ),
        (snapshot) => {
          if (!active) return;
          chunkResults[index] = mapSnapshot(snapshot);
          chunkLoaded[index] = true;
          updateFireDrills();
        },
        (listenerError) => {
          if (!active) return;
          console.error("FSM dashboard fire drill listener failed", listenerError);
          setError(listenerError.message || "Could not sync dashboard fire drills.");
          chunkLoaded[index] = true;
          updateFireDrills();
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

  const liveFireDrills = useMemo(
    () => uniqueById([
      ...data.fireDrills,
      ...data.fsmFireDrills,
      ...data.buildingFireDrills
    ]),
    [data.buildingFireDrills, data.fireDrills, data.fsmFireDrills]
  );

  const statusBreakdown = useMemo(
    () => buildStatusBreakdown(data.issues),
    [data.issues]
  );

  const monthlyTrend = useMemo(
    () => buildMonthlyTrend(data.issues),
    [data.issues]
  );

  const recentReports = useMemo(
    () => buildRecentReports(data.issues, buildingMap),
    [data.issues, buildingMap]
  );

  const liveReports = useMemo(
    () => uniqueById([...data.reports, ...data.buildingReports]),
    [data.buildingReports, data.reports]
  );

  const upcomingSchedule = useMemo(
    () => buildUpcomingSchedule(liveFireDrills, buildingMap),
    [liveFireDrills, buildingMap]
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
    reports: liveReports,
    fireDrills: liveFireDrills,
    issues: data.issues,
    statusBreakdown,
    monthlyTrend,
    recentReports,
    upcomingSchedule
  };
};
