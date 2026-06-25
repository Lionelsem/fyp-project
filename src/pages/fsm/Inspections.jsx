import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getInspectionByAssignmentPeriod,
  getInspectionByAssignmentPeriodStatus,
  getInspectionResultsByInspectionId,
  getInspectionResultsByInspectionKey,
  upsertInspection,
  upsertInspectionResult
} from "../../services/inspectionService";
import { addClosureVerification, getIssueById, upsertIssue } from "../../services/issueService";
import { APPROVAL_STATUS, ISSUE_STATUS, REPORT_STATUS } from "../../constants/status";
import { useAuth } from "../../hooks/useAuth";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";
import { getInspectionDefectPhotoFolder, uploadFile } from "../../services/storageService";
import { upsertReport } from "../../services/reportService";

const initialChecklist = [
  {
    id: "encroachment",
    title: "A. Encroachment",
    description: "Verify any building or site encroachments before inspection.",
    expanded: true,
    items: [
      {
        id: "A1",
        code: "A",
        label: "Encroachment review",
        storey: "All",
        location: "All",
        condition: "Good",
        remark: "N.A.",
        photo: "",
        issue: {
          description: "",
          rectification: "",
          priority: "High",
          status: "Open",
          photo: ""
        },
        expanded: false
      }
    ]
  },
  {
    id: "fire-protection",
    title: "B. Fire Protection Systems",
    description: "Fire alarm panel and sub-panel checks for panel indicators, batteries and signboards.",
    expanded: true,
    items: [
      { id: "1.0", code: "1.0", label: "Main Fire Alarm Panel", condition: "Good", remark: "", photo: "", issue: { description: "", rectification: "", priority: "High", status: "Open", photo: "" }, expanded: false },
      { id: "1.1", code: "1.1", label: "Main Supply Indicator", condition: "Good", remark: "", photo: "", issue: { description: "", rectification: "", priority: "High", status: "Open", photo: "" }, expanded: false },
      { id: "1.2", code: "1.2", label: "Zone Indicators", condition: "Faulty", remark: "One indicator not lit", photo: "", issue: { description: "Zone indicator failed on floor 4", rectification: "Replace faulty LED indicator", priority: "High", status: "Open", photo: "" }, expanded: true },
      { id: "1.3", code: "1.3", label: "Standby Battery / Charger", condition: "Good", remark: "", photo: "", issue: { description: "", rectification: "", priority: "High", status: "Open", photo: "" }, expanded: false },
      { id: "1.4", code: "1.4", label: "Main panel zone layout signboard", condition: "Good", remark: "", photo: "", issue: { description: "", rectification: "", priority: "High", status: "Open", photo: "" }, expanded: false },
      { id: "1.5", code: "1.5", label: "Floor layout signboard", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "2.0", code: "2.0", label: "Sub Fire Alarm Panel", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "2.1", code: "2.1", label: "Floors’ sub-fire alarm panel / zone indicators", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "2.2", code: "2.2", label: "Floors’ call point intact / last tested", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "2.3", code: "2.3", label: "Smoke detectors fully operational", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "2.4", code: "2.4", label: "Heat detectors fully operational", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "2.5", code: "2.5", label: "Sprinkler heads", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "2.6", code: "2.6", label: "Alarm bell fully functional", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "2.7", code: "2.7", label: "Accessories fully operational", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "2.8", code: "2.8", label: "Expired / renewal maintenance contract", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false }
    ]
  },
  {
    id: "hosereel",
    title: "C. Fire Hosereel System",
    description: "Review hosereel pumps, control panels, pressure parts, and signage.",
    expanded: false,
    items: [
      { id: "3.0", code: "3.0", label: "Fire Hosereel serviceable?", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "3.1", code: "3.1", label: "Obstruction to fire hose reel?", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "3.2", code: "3.2", label: "Regularly inspection", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "3.4", code: "3.4", label: "Hosereel Pumps", condition: "Good", remark: "Pump room tidy", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "3.4.1", code: "3.4.1", label: "Condition of Hosereel pumps", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "3.4.2", code: "3.4.2", label: "Control panel operational", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "3.4.3", code: "3.4.3", label: "Pressure switches operational", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "3.4.4", code: "3.4.4", label: "Pressure gauge operational", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "3.4.5", code: "3.4.5", label: "Signboard / label", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "3.4.6", code: "3.4.6", label: "Hose reel drums", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false }
    ]
  },
  {
    id: "extinguishers",
    title: "D. Fire Extinguishers",
    description: "Assess fire extinguishers type, location, service dates, and accessibility.",
    expanded: false,
    items: [
      { id: "4.0", code: "4.0", label: "Fire Extinguishers", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "4.1", code: "4.1", label: "Type of fire extinguishers / Location / Last serviced", condition: "Good", remark: "Dry B & C Powder / Various places / Sept 2025", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "4.2", code: "4.2", label: "Obstruction to fire extinguisher", condition: "Good", remark: "OK", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false }
    ]
  },
  {
    id: "escape",
    title: "E. Means of Escape",
    description: "Inspect escape staircases, exit lights, fire doors and signage.",
    expanded: false,
    items: [
      { id: "5.1", code: "5.1", label: "Means of Escape", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "5.2", code: "5.2", label: "Obstruction along escape staircases / door", condition: "Faulty", remark: "Bicycle blocking corridor", photo: "", issue: { description: "Escape route obstruction at corridor outside unit 01-15", rectification: "Relocate bicycle and clear path", priority: "High", status: "In Progress", photo: "" }, expanded: true },
      { id: "5.3", code: "5.3", label: "Exit lights at staircases", condition: "Good", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "5.4", code: "5.4", label: "Fire alarm bell at staircases", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "5.5", code: "5.5", label: "Emergency lightings at staircases", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "5.6", code: "5.6", label: "Pressure fan at staircases", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "6.0", code: "6.0", label: "Fire door at lift lobby kept closed", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "6.1", code: "6.1", label: "Fire Lift", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "6.2", code: "6.2", label: "Fireman switch", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.0", code: "7.0", label: '"In Case of Fire, Do Not Use Lift" Signboards', condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false }
    ]
  },
  {
    id: "sprinkler",
    title: "F. Sprinkler System",
    description: "Confirm valve positions, pump room condition, and piping signage for the sprinkler system.",
    expanded: false,
    items: [
      { id: "7.1.1", code: "7.1.1", label: "Sprinkler Control Valve", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.1.2", code: "7.1.2", label: "Valve at open position strapped & locked", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.1.3", code: "7.1.3", label: "Drain out valve at close position", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.1.4", code: "7.1.4", label: "Water gong", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.1.5", code: "7.1.5", label: "Pressure gauge operational", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.1.6", code: "7.1.6", label: "Pressure-switch operational", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.1.7", code: "7.1.7", label: "Breeching inlet", condition: "Faulty", remark: "Paint faded badly", photo: "", issue: { description: "Breeching inlet paint faded badly", rectification: "Apply fresh paint", priority: "Medium", status: "Open", photo: "" }, expanded: true },
      { id: "7.1.8", code: "7.1.8", label: "Signboard / label", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.1.9", code: "7.1.9", label: "Obstruction", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.2", code: "7.2", label: "Sprinkler pump", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.3", code: "7.3", label: "Sprinkler inlet box / Diesel Pump", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.3.1", code: "7.3.1", label: "Condition of fire door", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.3.2", code: "7.3.2", label: "Emergency light / lighting", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.3.3", code: "7.3.3", label: "Position of fire extinguisher", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.3.4", code: "7.3.4", label: "Condition of Jockey pumps", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.3.5", code: "7.3.5", label: "Control panel operational", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.3.6", code: "7.3.6", label: "Valve open position / strapped & locked", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.3.7", code: "7.3.7", label: "Upkeep of sprinkler pump room", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "7.3.8", code: "7.3.8", label: "Floor / wall / ceiling", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false }
    ]
  },
  {
    id: "dry-riser",
    title: "G. Dry Riser",
    description: "Check landing valves, breeching inlet, paint, locks and pressure release devices.",
    expanded: false,
    items: [
      { id: "8.1", code: "8.1", label: "All landing valves strapped & locked", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "8.2", code: "8.2", label: "Obstruction to dry riser landing valves", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "8.3", code: "8.3", label: "Dry riser breeching inlet box", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "8.4", code: "8.4", label: "Dry riser breeching inlet paint yellow", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "8.5", code: "8.5", label: "Door no locking device", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "8.6", code: "8.6", label: "Label / signboard", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "8.7", code: "8.7", label: "Compound door locked", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "8.8", code: "8.8", label: "Pressure release valve operational", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "8.9", code: "8.9", label: "Air release valve operational", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "8.10", code: "8.10", label: "Obstruction", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false }
    ]
  },
  {
    id: "others",
    title: "H. Others",
    description: "General safety observations for access, storage, unauthorized structures and equipment maintenance.",
    expanded: false,
    items: [
      { id: "9.1", code: "9.1", label: "Exit doors unlocked", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "9.2", code: "9.2", label: "Fire safety equipment maintained according to schedule?", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "9.3", code: "9.3", label: "Fireman access and fire engine access routes free from obstruction?", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "9.4", code: "9.4", label: "Any unauthorized structure?", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false },
      { id: "9.5", code: "9.5", label: "Any illegal storage / dumping of combustible material?", condition: "", remark: "", photo: "", issue: { description: "", rectification: "", priority: "Medium", status: "Open", photo: "" }, expanded: false }
    ]
  }
];

const inspectionInfo = {
  building: "CBRE A",
  month: "May, 2026",
  inspector: "CBRE A",
  lastUpdated: "22 May 2026, 09:30 AM"
};

const conditionOptions = [
  { value: "Good", label: "Good" },
  { value: "Faulty", label: "Faulty" },
  { value: "N.A.", label: "N.A." }
];

const validConditionValues = new Set(conditionOptions.map((option) => option.value));

const normalizeChecklistCondition = (condition) =>
  validConditionValues.has(condition) ? condition : "";

const buildAppendixEntriesFromChecklist = (checklist, fallbackLocation) =>
  checklist.flatMap((category) =>
    category.items
      .filter((item) => item.condition && String(item.remark || "").trim())
      .map((item) => {
        const linkedDetails = [
          item.issue?.description && `Finding: ${item.issue.description}`,
          item.issue?.rectification && `Rectification: ${item.issue.rectification}`
        ].filter(Boolean);

        return {
          location: item.location || item.storey || fallbackLocation || "-",
          findings: [
            `Section: ${category.title}`,
            `Item: ${item.code} - ${item.label}`,
            `Condition: ${item.condition}`
          ].join("\n"),
          remarks: [
            String(item.remark || "").trim(),
            ...linkedDetails
          ].join("\n")
        };
      })
  );

const sampleReportPrefillByItemCode = {
  "4.1": {
    condition: "Good",
    remark: "Dry B & C Powder / Various places / Sept 2025"
  },
  "4.2": {
    condition: "Good",
    remark: "OK"
  },
  "5.2": {
    condition: "Faulty",
    remark: "Refer to APPENDIX A",
    issue: {
      description: "Obstruction to escape way, hose reel tag shown expired inspection date, and loose call point cover at corridor outside unit 01-15.",
      rectification: "Relocate the bicycle, check and re-tag the hose reel, and reinstate or replace the loose cover.",
      priority: "High"
    }
  },
  "5.6": {
    condition: "N.A.",
    remark: "N.A."
  },
  "6.2": {
    condition: "Faulty",
    remark: "Refer to APPENDIX A",
    issue: {
      description: "FCC / Guardhouse message control button labelling missing, no Plan B for message equipment failure, and some speakers not functioning when fire alarm triggered.",
      rectification: "Label message buttons, place a hard copy message script at the PA panel, and conduct a PA system and speaker audit.",
      priority: "High"
    }
  },
  "7.1.2": {
    condition: "Faulty",
    remark: "Refer to APPENDIX A",
    issue: {
      description: "Sprinkler control valve room straps and locks are faulty.",
      rectification: "Replace straps and locks with proper labelling.",
      priority: "High"
    }
  },
  "7.1.8": {
    condition: "Faulty",
    remark: "Refer to APPENDIX A",
    issue: {
      description: "CV1 and CV2 labelling missing in sprinkler control valve room.",
      rectification: "Reinstate the missing labelling.",
      priority: "Medium"
    }
  },
  "8.10": {
    condition: "Faulty",
    remark: "Refer to APPENDIX A",
    issue: {
      description: "Obstruction to escape way noted in Appendix A.",
      rectification: "Remove obstruction and maintain clear access.",
      priority: "High"
    }
  }
};

const getSampleReportPrefill = (item) => ({
  condition: "Good",
  remark: "",
  issue: {},
  ...(sampleReportPrefillByItemCode[item.code] || {})
});

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

  return matchingEntry ? String(matchingEntry[1]).trim() : "";
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

const LEVEL_COUNT_FIELDS = [
  "noOfStoreys",
  "storeys",
  "numberOfStoreys",
  "noOfLevels",
  "levels",
  "levelCount",
  "floorCount",
  "floors"
];

const getBuildingName = (building) =>
  getFirstTextValue(building, BUILDING_NAME_FIELDS) || "Assigned building pending";

const parsePositiveInteger = (value) => {
  if (value === undefined || value === null || Array.isArray(value)) return 0;
  const match = String(value).match(/\d+/);
  const count = match ? Number.parseInt(match[0], 10) : 0;
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const getBuildingLevelCount = (building) => {
  if (!building) return 0;
  const explicitLevels = building.levels || building.floors;

  if (Array.isArray(explicitLevels)) {
    return explicitLevels.length;
  }

  return parsePositiveInteger(getFirstTextValue(building, LEVEL_COUNT_FIELDS));
};

const buildLevelsForBuilding = (building) => {
  if (!building) return [];

  const explicitLevels = building.levels || building.floors;
  if (Array.isArray(explicitLevels) && explicitLevels.length > 0) {
    return explicitLevels.map((level, index) => {
      const fallbackName = `Level ${index + 1}`;
      if (typeof level === "string" || typeof level === "number") {
        const label = String(level).trim() || fallbackName;
        return { id: `level-${index + 1}`, name: label };
      }

      return {
        id: level.id || level.floorId || level.levelId || `level-${index + 1}`,
        name: level.floorName || level.levelName || level.floorCode || level.levelCode || fallbackName
      };
    });
  }

  const levelCount = getBuildingLevelCount(building);
  return Array.from({ length: levelCount }, (_, index) => ({
    id: `level-${index + 1}`,
    name: `Level ${index + 1}`
  }));
};

const createEmptyChecklist = () =>
  initialChecklist.map((category) => ({
    ...category,
    items: category.items.map((item) => {
      const prefill = getSampleReportPrefill(item);

      return {
        ...item,
        condition: prefill.condition,
        remark: prefill.remark,
        photo: "",
        photoPreview: "",
        photoFile: null,
        issue: {
          description: prefill.issue?.description || "",
          rectification: prefill.issue?.rectification || "",
          priority: prefill.issue?.priority || item.issue?.priority || "Medium",
          status: "Open",
          photo: ""
        },
        expanded: false
      };
    })
  }));

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

const getPrimaryFsmId = (user) =>
  getFsmLookupIds(user).map((value) => String(value || "").trim()).find(Boolean) || "";

const getInspectorName = (user) =>
  user?.fullName || user?.displayName || user?.email?.split("@")[0] || "FSM";

const formatInspectionMonth = () =>
  new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

const formatLastUpdated = () =>
  new Date().toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

const getPassFail = (condition) => {
  if (condition === "Good") return "Pass";
  if (condition === "Faulty") return "Fail";
  if (condition === "N.A.") return "N.A.";
  return "";
};

const getPeriodKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getPreviousMonthPeriodKey = (periodKey) => {
  const match = String(periodKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return "";

  const year = Number.parseInt(match[1], 10);
  const monthIndex = Number.parseInt(match[2], 10) - 1;
  const previousMonth = new Date(year, monthIndex - 1, 1);

  return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;
};

const buildChecklistResultKey = (categoryCode, itemCode) =>
  `${String(categoryCode || "").trim()}::${String(itemCode || "").trim()}`;

const getResultFallbackItemId = (result) => {
  const directId = result?.itemId || result?.checklistItemId;
  if (directId) return directId;

  const resultKey = result?.resultKey || result?.resultId || result?.id || "";
  const parts = String(resultKey).split("__");
  return parts.length > 0 ? parts[parts.length - 1] : "";
};

const buildPreviousResultsMap = (previousResults = []) => {
  const resultMap = new Map();

  previousResults.forEach((result) => {
    const categoryCode = result.categoryCode || result.categoryId;
    const itemCode = result.itemCode || result.itemId || result.checklistItemId;
    const fallbackItemId = getResultFallbackItemId(result);

    if (categoryCode && itemCode) {
      resultMap.set(buildChecklistResultKey(categoryCode, itemCode), result);
    }

    if (categoryCode && fallbackItemId) {
      resultMap.set(buildChecklistResultKey(categoryCode, fallbackItemId), result);
    }
  });

  return resultMap;
};

const hydrateChecklistFromPreviousMonth = (templateChecklist, previousResults = []) => {
  const previousResultMap = buildPreviousResultsMap(previousResults);

  return templateChecklist.map((category) => ({
    ...category,
    items: category.items.map((item) => {
      const previousResult =
        previousResultMap.get(buildChecklistResultKey(category.id, item.code)) ||
        previousResultMap.get(buildChecklistResultKey(category.id, item.id));

      return {
        ...item,
        condition: previousResult
          ? normalizeChecklistCondition(previousResult.condition) || item.condition
          : item.condition,
        remark: previousResult ? previousResult.remark || "" : item.remark || "",
        photo: "",
        photoPreview: "",
        photoFile: null,
        issue: {
          ...item.issue,
          description: previousResult?.issueDescription || previousResult?.issue?.description || item.issue?.description || "",
          rectification: previousResult?.rectification || previousResult?.issue?.rectification || item.issue?.rectification || "",
          priority: previousResult?.priority || previousResult?.issue?.priority || item.issue?.priority || "Medium",
          status: "Open",
          photo: ""
        },
        expanded: false
      };
    })
  }));
};

const hydrateChecklistFromSavedResults = (templateChecklist, savedResults = []) => {
  const savedResultMap = buildPreviousResultsMap(savedResults);

  return templateChecklist.map((category) => ({
    ...category,
    items: category.items.map((item) => {
      const savedResult =
        savedResultMap.get(buildChecklistResultKey(category.id, item.code)) ||
        savedResultMap.get(buildChecklistResultKey(category.id, item.id));

      if (!savedResult) return item;

      const condition = normalizeChecklistCondition(savedResult.condition) || item.condition;
      const defectPhotoUrls = getDefectPhotoUrls(savedResult);
      const defectPhotoUrl = defectPhotoUrls[0] || "";

      return {
        ...item,
        condition,
        remark: savedResult.remark || "",
        photo: defectPhotoUrl,
        defectPhotoUrls,
        defectPhotoStoragePath: savedResult.defectPhotoStoragePath || "",
        defectPhotoUploadedAt: savedResult.defectPhotoUploadedAt || null,
        defectPhotoUploadedBy: savedResult.defectPhotoUploadedBy || "",
        photoPreview: "",
        photoFiles: [],
        photoPreviews: [],
        issue: {
          ...item.issue,
          description: savedResult.issueDescription || savedResult.issue?.description || "",
          rectification: savedResult.rectification || savedResult.issue?.rectification || "",
          priority: savedResult.priority || savedResult.issue?.priority || item.issue?.priority || "Medium",
          status: savedResult.issueStatus || savedResult.issue?.status || "Open",
          photo: ""
        },
        expanded: condition === "Faulty"
      };
    })
  }));
};

const getIssueTargetCategoryCode = (issue) => {
  if (issue?.categoryCode) return issue.categoryCode;

  const parts = String(issue?.resultKey || issue?.resultId || issue?.issueKey || issue?.issueId || "").split("__");
  return parts.length >= 2 ? parts[parts.length - 2] : "";
};

const getIssueTargetItemCode = (issue) => {
  if (issue?.itemCode) return issue.itemCode;

  const parts = String(issue?.resultKey || issue?.resultId || issue?.issueKey || issue?.issueId || "").split("__");
  return parts.length >= 1 ? parts[parts.length - 1] : "";
};

const getIssueRowDomId = (categoryId, itemId) =>
  `inspection-row-${sanitizeKeyPart(categoryId)}-${sanitizeKeyPart(itemId)}`;

const getDefectPhotoUrl = (source) =>
  getDefectPhotoUrls(source)[0] || "";

const getFixPhotoUrl = (source) =>
  getFixPhotoUrls(source)[0] || "";

const PHOTO_LIMIT = 3;

const uniqueValues = (values) =>
  Array.from(new Set((values || []).filter(Boolean)));

const getDefectPhotoUrls = (source) =>
  uniqueValues([
    ...(Array.isArray(source?.defectPhotoUrls) ? source.defectPhotoUrls : []),
    source?.defectPhotoUrl,
    source?.issuePhotoUrl,
    source?.photoUrl
  ]).slice(0, PHOTO_LIMIT);

const getFixPhotoUrls = (source) =>
  uniqueValues([
    ...(Array.isArray(source?.fixPhotoUrls) ? source.fixPhotoUrls : []),
    source?.fixPhotoUrl,
    source?.afterPhotoUrl
  ]).slice(0, PHOTO_LIMIT);

const createAuditEntry = ({ status, note, updatedBy, eventType }) => ({
  status,
  note: note || "",
  updatedBy: updatedBy || "",
  updatedAt: new Date(),
  eventType: eventType || "status_update"
});

const appendHistory = (issue, entries) => [
  ...(Array.isArray(issue?.history) ? issue.history : []),
  ...entries.filter(Boolean)
];

const isIssueTargetRow = (issue, category, item) => {
  const categoryCode = getIssueTargetCategoryCode(issue);
  const itemCode = getIssueTargetItemCode(issue);

  return Boolean(
    issue &&
    categoryCode &&
    itemCode &&
    category.id === categoryCode &&
    (item.code === itemCode || item.id === itemCode)
  );
};

const applyIssueFocusToChecklist = (sourceChecklist, issue) => {
  if (!issue) return sourceChecklist;

  return sourceChecklist.map((category) => {
    const hasTargetItem = category.items.some((item) => isIssueTargetRow(issue, category, item));

    return {
      ...category,
      expanded: category.expanded || hasTargetItem,
      items: category.items.map((item) =>
        isIssueTargetRow(issue, category, item)
          ? {
              ...item,
              expanded: true,
              issue: {
                ...item.issue,
                description: issue.issueDescription || item.issue?.description || "",
                rectification: issue.rectification || item.issue?.rectification || "",
                priority: issue.priority || item.issue?.priority || "Medium",
                status: issue.status || item.issue?.status || ISSUE_STATUS.OPEN,
                history: Array.isArray(issue.history) ? issue.history : item.issue?.history || []
              },
              defectPhotoUrls: getDefectPhotoUrls(issue).length ? getDefectPhotoUrls(issue) : item.defectPhotoUrls,
              fixPhotoUrls: getFixPhotoUrls(issue)
            }
          : item
      )
    };
  });
};

const mergeIssueTicketsIntoChecklist = (sourceChecklist, issues = []) =>
  sourceChecklist.map((category) => ({
    ...category,
    items: category.items.map((item) => {
      const issue = issues.find((candidate) => isIssueTargetRow(candidate, category, item));
      if (!issue) return item;

      return {
        ...item,
        issue: {
          ...item.issue,
          description: issue.issueDescription || item.issue?.description || "",
          rectification: issue.rectification || item.issue?.rectification || "",
          priority: issue.priority || item.issue?.priority || "Medium",
          status: issue.status || item.issue?.status || ISSUE_STATUS.OPEN,
          history: Array.isArray(issue.history) ? issue.history : item.issue?.history || []
        },
        defectPhotoUrls: getDefectPhotoUrls(issue).length ? getDefectPhotoUrls(issue) : item.defectPhotoUrls,
        fixPhotoUrls: getFixPhotoUrls(issue)
      };
    })
  }));

const findFirstUnansweredChecklistItem = (checklist) => {
  for (const category of checklist) {
    const item = category.items.find((checklistItem) => !validConditionValues.has(checklistItem.condition));
    if (item) return { category, item };
  }

  return null;
};

const sanitizeKeyPart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";

const buildRecordKey = (...parts) => parts.map(sanitizeKeyPart).join("__");

const InspectionOverview = ({
  completedCount,
  totalRows,
  progressPercent,
  inspectionInfo,
  buildingName,
  assignmentLoading,
  assignmentError,
  levels,
  selectedLevel,
  setSelectedLevel
}) => (
  <section className="inspection-card overview-card">
    <div className="card-inner">
      <div className="card-title-row overview-top-row">
        <div>
          <p className="overline">Inspection Overview</p>
          <h3>Monthly Inspection Report</h3>
        </div>
      </div>
      <div className="overview-grid">
        <div>
          <span className="overview-label">Building</span>
          <p>{assignmentLoading ? "Loading assigned building..." : buildingName}</p>
        </div>
        <div>
          <span className="overview-label">Level</span>
          <label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              disabled={levels.length === 0}
            >
              <option value="">
                {levels.length === 0 ? "No levels configured" : "Select level"}
              </option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>{level.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <span className="overview-label">Month</span>
          <p>{inspectionInfo.month}</p>
        </div>
        <div>
          <span className="overview-label">Inspector</span>
          <p>{inspectionInfo.inspector}</p>
        </div>
        <div>
          <span className="overview-label">Last Updated</span>
          <p>{inspectionInfo.lastUpdated}</p>
        </div>
        {assignmentError && (
          <div>
            <span className="overview-label">Assignment Status</span>
            <p>{assignmentError}</p>
          </div>
        )}
      </div>
      <div className="progress-footer">
        <div className="progress-header">
          <span>Overall Progress</span>
          <span>{completedCount} / {totalRows} Completed</span>
        </div>
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="overall-progress-label">{progressPercent}% completed</p>
      </div>
    </div>
  </section>
);

const IssueSummary = ({ openCount, inProgressCount, resolvedCount }) => (
  <section className="inspection-card issue-summary-card">
    <div className="card-title-row">
      <p className="overline">Issue Summary</p>
      <button className="summary-toggle">Show issues & defects</button>
    </div>
    <div className="issue-summary-grid">
      <div className="issue-pill open">
        <p className="summary-label">Open</p>
        <strong>{openCount}</strong>
      </div>
      <div className="issue-pill in-progress">
        <p className="summary-label">In Progress</p>
        <strong>{inProgressCount}</strong>
      </div>
      <div className="issue-pill resolved">
        <p className="summary-label">Resolved</p>
        <strong>{resolvedCount}</strong>
      </div>
    </div>
  </section>
);

const getConditionClass = (condition) => {
  if (condition === "Good") return "condition-good";
  if (condition === "Faulty") return "condition-faulty";
  if (condition === "N.A.") return "condition-na";
  return "";
};

const toDate = (value) => {
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

const formatAuditDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "-";

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const statusClassName = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === String(ISSUE_STATUS.CLOSED).toLowerCase()) return "issue-status issue-status--closed";
  if (normalized === String(ISSUE_STATUS.RESOLVED).toLowerCase()) return "issue-status issue-status--resolved";
  if (normalized === String(ISSUE_STATUS.IN_PROGRESS).toLowerCase()) return "issue-status issue-status--progress";
  return "issue-status issue-status--open";
};

const IssueHistoryTimeline = ({ history = [] }) => {
  const entries = [...history].sort((first, second) => {
    const firstTime = toDate(first.updatedAt)?.getTime() || 0;
    const secondTime = toDate(second.updatedAt)?.getTime() || 0;
    return secondTime - firstTime;
  });

  return (
    <div className="issue-history-panel issue-history-panel--compact">
      <div className="card-header-row">
        <h5>Status History</h5>
        <span className="hint-text">{entries.length} entries</span>
      </div>
      {entries.length > 0 ? (
        <ol className="issue-history-timeline">
          {entries.map((entry, index) => (
            <li key={`${entry.eventType || "event"}-${index}`}>
              <span className={statusClassName(entry.status)}>{entry.status || "Update"}</span>
              <div>
                <strong>{String(entry.eventType || "status update").replace(/_/g, " ")}</strong>
                <p>{entry.updatedBy || "-"} · {formatAuditDateTime(entry.updatedAt)}</p>
                {entry.note ? <small>{entry.note}</small> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="hint-text">No status history recorded yet.</p>
      )}
    </div>
  );
};

// eslint-disable-next-line no-unused-vars
const InspectionChecklistRow = ({ item, categoryId, onUpdate, onPhotoChange, onIssueUpdate, onToggle, onRemovePhoto }) => {
  const hasIssue = item.condition === "Faulty";
  const rowOpen = item.expanded || hasIssue;
  const selectClass = getConditionClass(item.condition);
  const photoPreview = item.photoPreview || item.photo;

  return (
    <div className={`checklist-row ${rowOpen ? "expanded" : ""}`}>
      <div className="row-main">
        <div className="row-code">{item.code}</div>
        <div className="row-title">
          <span>{item.label}</span>
          {item.remark ? <small>{item.remark}</small> : null}
        </div>
        <label className="select-group">
          <span className="sr-only">Condition for {item.label}</span>
          <select
            className={selectClass}
            value={item.condition}
            onChange={(e) => onUpdate(categoryId, item.id, { condition: e.target.value })}
          >
            <option value="">Select condition</option>
            {conditionOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <input
          className="remark-input"
          type="text"
          value={item.remark}
          placeholder="Remark"
          onChange={(e) => onUpdate(categoryId, item.id, { remark: e.target.value })}
        />
        <label className="photo-upload">
          <input type="file" accept="image/*" onChange={(e) => onPhotoChange(categoryId, item.id, e.target.files)} />
          <span>{photoPreview ? "Change photo" : "Upload photo"}</span>
        </label>
        <div className="photo-thumb-wrapper">
          {photoPreview ? (
            <>
              <img className="photo-thumb" src={photoPreview} alt="" />
              <button type="button" className="photo-remove-btn" onClick={() => onRemovePhoto(categoryId, item.id)} aria-label="Remove photo">
                ×
              </button>
            </>
          ) : (
            <div className="photo-thumb empty" aria-hidden="true" />
          )}
        </div>
        <button type="button" className="expand-btn" onClick={() => onToggle(categoryId, item.id)} aria-label="Toggle detail row">
          {rowOpen ? "▾" : "▸"}
        </button>
      </div>
      {rowOpen && (
        <div className="row-detail">
          <div className="detail-grid">
            <label>
              <span>Remark</span>
              <textarea
                value={item.remark}
                rows={2}
                placeholder="Add additional notes"
                onChange={(e) => onUpdate(categoryId, item.id, { remark: e.target.value })}
              />
            </label>
            <label>
              <span>Photo Upload</span>
              <input type="file" accept="image/*" onChange={(e) => onPhotoChange(categoryId, item.id, e.target.files)} />
            </label>
          </div>
          {hasIssue && (
            <div className="issue-panel">
              <h4>Issue Details <span className="issue-badge">Auto created when marked as Faulty</span></h4>
              <label>
                <span>Issue Description</span>
                <textarea
                  value={item.issue.description}
                  rows={2}
                  placeholder="Describe the fault"
                  onChange={(e) => onIssueUpdate(categoryId, item.id, { description: e.target.value })}
                />
              </label>
              <label>
                <span>Proposal Rectification</span>
                <input
                  type="text"
                  value={item.issue.rectification}
                  placeholder="Recommended rectification"
                  onChange={(e) => onIssueUpdate(categoryId, item.id, { rectification: e.target.value })}
                />
              </label>
              <div className="issue-fields-row">
                <label>
                  <span>Priority</span>
                  <select
                    value={item.issue.priority}
                    onChange={(e) => onIssueUpdate(categoryId, item.id, { priority: e.target.value })}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select
                    value={item.issue.status}
                    onChange={(e) => onIssueUpdate(categoryId, item.id, { status: e.target.value })}
                  >
                    <option value={ISSUE_STATUS.OPEN}>{ISSUE_STATUS.OPEN}</option>
                    <option value={ISSUE_STATUS.IN_PROGRESS}>{ISSUE_STATUS.IN_PROGRESS}</option>
                  </select>
                </label>
              </div>
              {item.issue.showChecklistIssuePhoto && item.issue.photo && (
                <div className="issue-photo-wrapper">
                  <img className="issue-photo-preview" src={item.issue.photo} alt="" />
                  <button
                    type="button"
                    className="photo-remove-btn issue-remove-btn"
                    onClick={() => onIssueUpdate(categoryId, item.id, { photo: "" })}
                    aria-label="Remove issue photo"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FaultProofChecklistRow = ({ item, categoryId, isHighlighted, isVerifyMode, onUpdate, onPhotoChange, onIssueUpdate, onToggle, onRemovePhoto, onVerifyClosure }) => {
  const hasIssue = item.condition === "Faulty";
  const rowOpen = item.expanded || hasIssue;
  const selectClass = getConditionClass(item.condition);
  const savedPhotoUrls = uniqueValues([...(item.defectPhotoUrls || []), item.photo]);
  const photoUrls = uniqueValues([...savedPhotoUrls, ...(item.photoPreviews || []), item.photoPreview]).slice(0, PHOTO_LIMIT);

  return (
    <div
      id={getIssueRowDomId(categoryId, item.id)}
      className={`checklist-row ${rowOpen ? "expanded" : ""} ${isHighlighted ? "verify-highlight" : ""}`}
    >
      <div className="row-main">
        <div className="row-code">{item.code}</div>
        <div className="row-title">
          <span>{item.label}</span>
          {item.remark ? <small>{item.remark}</small> : null}
        </div>
        <label className="select-group">
          <span className="sr-only">Condition for {item.label}</span>
          <select
            className={selectClass}
            value={item.condition}
            onChange={(e) => onUpdate(categoryId, item.id, { condition: e.target.value })}
          >
            <option value="">Select condition</option>
            {conditionOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <input
          className="remark-input"
          type="text"
          value={item.remark}
          placeholder="Remark"
          onChange={(e) => onUpdate(categoryId, item.id, { remark: e.target.value })}
        />
        <button
          type="button"
          className="expand-btn"
          onClick={() => onToggle(categoryId, item.id)}
          aria-label="Toggle detail row"
          disabled={!hasIssue}
        >
          {hasIssue ? (rowOpen ? "\u25be" : "\u25b8") : ""}
        </button>
      </div>
      {hasIssue && rowOpen && (
        <div className="row-detail">
          <div className="issue-panel">
            <h4>Issue Details <span className="issue-badge">Auto created when marked as Faulty</span></h4>
            <label>
              <span>Issue Description</span>
              <textarea
                value={item.issue.description}
                rows={2}
                placeholder="Describe the fault"
                onChange={(e) => onIssueUpdate(categoryId, item.id, { description: e.target.value })}
              />
            </label>
            <label>
              <span>Proposal Rectification</span>
              <input
                type="text"
                value={item.issue.rectification}
                placeholder="Recommended rectification"
                onChange={(e) => onIssueUpdate(categoryId, item.id, { rectification: e.target.value })}
              />
            </label>
            <div className="issue-fields-row">
              <label>
                <span>Priority</span>
                <select
                  value={item.issue.priority}
                  onChange={(e) => onIssueUpdate(categoryId, item.id, { priority: e.target.value })}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>
              <label className="issue-status-field">
                <span>Status</span>
                <select
                  value={item.issue.status}
                  onChange={(e) => onIssueUpdate(categoryId, item.id, { status: e.target.value })}
                >
                  <option value={ISSUE_STATUS.OPEN}>{ISSUE_STATUS.OPEN}</option>
                  <option value={ISSUE_STATUS.IN_PROGRESS}>{ISSUE_STATUS.IN_PROGRESS}</option>
                  <option value={ISSUE_STATUS.RESOLVED}>{ISSUE_STATUS.RESOLVED}</option>
                  <option value={ISSUE_STATUS.CLOSED}>{ISSUE_STATUS.CLOSED}</option>
                </select>
                {item.issue.status === ISSUE_STATUS.RESOLVED && (
                  <button
                    type="button"
                    className="primary-button checklist-verify-button"
                    onClick={() => onVerifyClosure(categoryId, item)}
                  >
                    Verify Closure
                  </button>
                )}
              </label>
            </div>
            <IssueHistoryTimeline history={item.issue?.history || []} />
            {!isVerifyMode && (
              <div className="fault-proof-row">
                <label className="issue-photo-upload">
                  <span>Defect photos (max 3)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={photoUrls.length >= PHOTO_LIMIT}
                    onChange={(e) => onPhotoChange(categoryId, item.id, e.target.files)}
                  />
                </label>
                <div className="issue-photo-wrapper issue-photo-wrapper--grid">
                  {Array.from({ length: PHOTO_LIMIT }).map((_, index) => {
                    const photoUrl = photoUrls[index];
                    return photoUrl ? (
                      <figure key={`${photoUrl}-${index}`} className="inspection-photo-preview">
                        <img className="issue-photo-preview" src={photoUrl} alt={`Original defect evidence ${index + 1}`} />
                        {index >= savedPhotoUrls.length && (
                          <button
                            type="button"
                            className="photo-remove-btn issue-remove-btn"
                            onClick={() => onRemovePhoto(categoryId, item.id, index - savedPhotoUrls.length)}
                            aria-label="Remove selected defect photo"
                          >
                            &times;
                          </button>
                        )}
                      </figure>
                    ) : (
                      <div key={`empty-${index}`} className="issue-photo-preview issue-ticket-detail-photo--empty" aria-label={`Defect photo slot ${index + 1}`} />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AppendixTable = ({ entries }) => (
  <section className="inspection-card appendix-card">
    <div className="card-title-row">
      <p className="overline">Appendix A</p>
      <h3>Findings & Rectification</h3>
    </div>
    <div className="appendix-table-wrapper">
      <table className="appendix-table">
        <thead>
          <tr>
            <th>S/No</th>
            <th>Location</th>
            <th>Findings</th>
            <th>Remarks / Proposed Rectification</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={`${entry.location}-${index}`}>
              <td>{index + 1}</td>
              <td>{entry.location}</td>
              <td>{entry.findings}</td>
              <td>{entry.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const Inspections = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isVerifyMode = location.pathname.includes("/verify");
  const issueIdFromQuery = useMemo(
    () => new URLSearchParams(location.search).get("issueId") || "",
    [location.search]
  );
  const {
    loading: assignmentLoading,
    error: assignmentError,
    buildings,
    issues
  } = useFsmDashboardData(getFsmLookupIds(user));
  const [selectedLevel, setSelectedLevel] = useState("");
  const [levelChecklists, setLevelChecklists] = useState({});
  const [levelRemarks, setLevelRemarks] = useState({});
  const [prefilledInspectionKeys, setPrefilledInspectionKeys] = useState({});
  const [verificationIssue, setVerificationIssue] = useState(location.state?.issue || null);
  const [verificationIssueError, setVerificationIssueError] = useState("");
  const [focusedVerificationKey, setFocusedVerificationKey] = useState("");
  const [inspectionSubmitError, setInspectionSubmitError] = useState("");
  const [inspectionSubmitSuccess, setInspectionSubmitSuccess] = useState("");
  const [inspectionSubmitting, setInspectionSubmitting] = useState(false);
  const [fixProofPhotoFile, setFixProofPhotoFile] = useState(null);
  const [fixProofPhotoPreview, setFixProofPhotoPreview] = useState("");

  const assignedBuilding =
    (verificationIssue?.buildingId
      ? buildings.find((building) => building.id === verificationIssue.buildingId)
      : null) ||
    buildings[0] ||
    null;
  const selectedBuilding = assignedBuilding?.id || "";
  const buildingName = assignedBuilding ? getBuildingName(assignedBuilding) : "No assigned building found";
  const levels = useMemo(() => buildLevelsForBuilding(assignedBuilding), [assignedBuilding]);
  const selectedLevelInfo = levels.find((level) => level.id === selectedLevel) || null;
  const selectedLevelName = selectedLevelInfo?.name || selectedLevel;
  const fsmId = getPrimaryFsmId(user);
  const periodKey = getPeriodKey();
  const inspectionKey = buildRecordKey(fsmId, selectedBuilding, selectedLevel, periodKey);
  const canSaveInspection = Boolean(selectedBuilding && selectedLevel && fsmId);
  const activeChecklist = levelChecklists[selectedLevel];
  const checklist = useMemo(
    () => activeChecklist || createEmptyChecklist(),
    [activeChecklist]
  );
  const generalRemarks = levelRemarks[selectedLevel] || "";

  const currentInspectionInfo = useMemo(
    () => ({
      ...inspectionInfo,
      building: buildingName,
      month: formatInspectionMonth(),
      inspector: getInspectorName(user),
      lastUpdated: formatLastUpdated()
    }),
    [buildingName, user]
  );

  useEffect(() => {
    if (!isVerifyMode && !issueIdFromQuery && !location.state?.issue) {
      setVerificationIssue(null);
      setVerificationIssueError("");
      setFixProofPhotoFile(null);
      setFixProofPhotoPreview("");
      return undefined;
    }

    if (location.state?.issue) {
      setVerificationIssue(location.state.issue);
      setVerificationIssueError("");
      return undefined;
    }

    if (!issueIdFromQuery) return undefined;

    let isCancelled = false;

    const loadIssue = async () => {
      try {
        const issue = await getIssueById(issueIdFromQuery);
        if (isCancelled) return;
        setVerificationIssue(issue);
        setVerificationIssueError(issue ? "" : "Could not find the selected issue.");
      } catch (err) {
        if (isCancelled) return;
        setVerificationIssueError(err.message || "Could not load the selected issue.");
      }
    };

    loadIssue();

    return () => {
      isCancelled = true;
    };
  }, [isVerifyMode, issueIdFromQuery, location.state]);

  useEffect(() => {
    setSelectedLevel((current) => {
      if (levels.length === 0) return "";
      if (
        verificationIssue?.floorId &&
        levels.some((level) => level.id === verificationIssue.floorId)
      ) {
        return verificationIssue.floorId;
      }
      return levels.some((level) => level.id === current) ? current : levels[0].id;
    });
  }, [levels, verificationIssue?.floorId]);

  useEffect(() => {
    setLevelChecklists({});
    setLevelRemarks({});
    setPrefilledInspectionKeys({});
  }, [selectedBuilding]);

  useEffect(() => {
    if (!selectedLevel) return;

    setLevelChecklists((current) => {
      if (current[selectedLevel]) return current;
      return {
        ...current,
        [selectedLevel]: createEmptyChecklist()
      };
    });
  }, [selectedLevel]);

  useEffect(() => {
    if (!selectedLevel) return;

    setLevelRemarks((current) => {
      if (Object.prototype.hasOwnProperty.call(current, selectedLevel)) return current;
      return {
        ...current,
        [selectedLevel]: ""
      };
    });
  }, [selectedLevel]);

  useEffect(() => {
    if (!canSaveInspection || prefilledInspectionKeys[inspectionKey]) return undefined;

    let isCancelled = false;

    const fetchInspectionResults = async (inspection) => {
      let results = await getInspectionResultsByInspectionId(
        inspection.inspectionId || inspection.id
      );

      if (results.length === 0 && inspection.inspectionKey) {
        results = await getInspectionResultsByInspectionKey(inspection.inspectionKey);
      }

      return results;
    };

    const loadChecklistForCurrentPeriod = async () => {
      const templateChecklist = createEmptyChecklist();

      try {
        if (verificationIssue && (verificationIssue.inspectionId || verificationIssue.inspectionKey)) {
          const linkedResults = verificationIssue.inspectionId
            ? await getInspectionResultsByInspectionId(verificationIssue.inspectionId)
            : await getInspectionResultsByInspectionKey(verificationIssue.inspectionKey);

          if (isCancelled) return;

          if (linkedResults.length > 0) {
            setLevelChecklists((current) => ({
              ...current,
              [selectedLevel]: applyIssueFocusToChecklist(
                hydrateChecklistFromSavedResults(templateChecklist, linkedResults),
                verificationIssue
              )
            }));

            setLevelRemarks((current) => ({
              ...current,
              [selectedLevel]: verificationIssue.generalRemarks || current[selectedLevel] || ""
            }));

            setPrefilledInspectionKeys((current) => ({ ...current, [inspectionKey]: true }));
            return;
          }
        }

        const currentInspection = await getInspectionByAssignmentPeriod({
          buildingId: selectedBuilding,
          floorId: selectedLevel,
          fsmId,
          periodKey
        });

        if (isCancelled) return;

        if (currentInspection) {
          const currentResults = await fetchInspectionResults(currentInspection);
          if (isCancelled) return;

          setLevelChecklists((current) => ({
            ...current,
            [selectedLevel]: applyIssueFocusToChecklist(
              hydrateChecklistFromSavedResults(templateChecklist, currentResults),
              verificationIssue
            )
          }));

          setLevelRemarks((current) => ({
            ...current,
            [selectedLevel]: currentInspection.generalRemarks || ""
          }));

          setPrefilledInspectionKeys((current) => ({ ...current, [inspectionKey]: true }));
          return;
        }

        const previousPeriodKey = getPreviousMonthPeriodKey(periodKey);
        let previousInspection = null;
        let previousResults = [];

        if (previousPeriodKey) {
          previousInspection = await getInspectionByAssignmentPeriodStatus({
            buildingId: selectedBuilding,
            floorId: selectedLevel,
            fsmId,
            periodKey: previousPeriodKey,
            status: "Submitted"
          });

          if (isCancelled) return;

          if (previousInspection) {
            previousResults = await fetchInspectionResults(previousInspection);
          }
        }

        if (isCancelled) return;

        setLevelChecklists((current) => ({
          ...current,
          [selectedLevel]: applyIssueFocusToChecklist(
            hydrateChecklistFromPreviousMonth(templateChecklist, previousResults),
            verificationIssue
          )
        }));

        setLevelRemarks((current) => ({
          ...current,
          [selectedLevel]: previousInspection?.generalRemarks || ""
        }));

        setPrefilledInspectionKeys((current) => ({ ...current, [inspectionKey]: true }));
      } catch (err) {
        if (isCancelled) return;

        setLevelChecklists((current) => ({
          ...current,
          [selectedLevel]: applyIssueFocusToChecklist(
            current[selectedLevel] || templateChecklist,
            verificationIssue
          )
        }));
        setLevelRemarks((current) => ({
          ...current,
          [selectedLevel]: current[selectedLevel] || ""
        }));
        setPrefilledInspectionKeys((current) => ({ ...current, [inspectionKey]: true }));

        // eslint-disable-next-line no-console
        console.error("Inspection checklist hydration failed", err);
      }
    };

    loadChecklistForCurrentPeriod();

    return () => {
      isCancelled = true;
    };
  }, [
    canSaveInspection,
    fsmId,
    inspectionKey,
    isVerifyMode,
    periodKey,
    prefilledInspectionKeys,
    selectedBuilding,
    selectedLevel,
    verificationIssue
  ]);

  useEffect(() => {
    if (!verificationIssue || !selectedLevel) return;

    const verificationKey = buildRecordKey(
      verificationIssue.issueKey || verificationIssue.issueId || verificationIssue.id,
      selectedLevel
    );
    if (focusedVerificationKey === verificationKey) return;

    const categoryCode = getIssueTargetCategoryCode(verificationIssue);
    const itemCode = getIssueTargetItemCode(verificationIssue);
    const matchedCategory = checklist.find((category) => category.id === categoryCode);
    const matchedItem = matchedCategory?.items.find((item) => item.code === itemCode || item.id === itemCode);

    if (!matchedCategory || !matchedItem) return;

    setLevelChecklists((current) => {
      const currentChecklist = current[selectedLevel];
      if (!currentChecklist) return current;

      return {
        ...current,
        [selectedLevel]: applyIssueFocusToChecklist(currentChecklist, verificationIssue)
      };
    });

    window.setTimeout(() => {
      document
        .getElementById(getIssueRowDomId(matchedCategory.id, matchedItem.id))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    setFocusedVerificationKey(verificationKey);
  }, [checklist, focusedVerificationKey, selectedLevel, verificationIssue]);

  useEffect(() => {
    if (!selectedLevel || !Array.isArray(issues) || issues.length === 0) return;

    setLevelChecklists((current) => {
      const currentChecklist = current[selectedLevel];
      if (!currentChecklist) return current;

      const relatedIssues = issues.filter((issue) =>
        (!selectedBuilding || issue.buildingId === selectedBuilding) &&
        (!selectedLevel || issue.floorId === selectedLevel || issue.floorName === selectedLevelName)
      );
      if (relatedIssues.length === 0) return current;

      const nextChecklist = mergeIssueTicketsIntoChecklist(currentChecklist, relatedIssues);
      if (JSON.stringify(nextChecklist) === JSON.stringify(currentChecklist)) return current;

      return {
        ...current,
        [selectedLevel]: nextChecklist
      };
    });
  }, [issues, selectedBuilding, selectedLevel, selectedLevelName]);

  const setChecklistForSelectedLevel = (updater) => {
    if (!selectedLevel) return;

    setLevelChecklists((current) => {
      const currentChecklist = current[selectedLevel] || createEmptyChecklist();
      const nextChecklist =
        typeof updater === "function" ? updater(currentChecklist) : updater;

      return {
        ...current,
        [selectedLevel]: nextChecklist
      };
    });
  };

  const setRemarksForSelectedLevel = (value) => {
    if (!selectedLevel) return;

    setLevelRemarks((current) => ({
      ...current,
      [selectedLevel]: value
    }));
  };

  const totalRows = useMemo(
    () => checklist.reduce((sum, category) => sum + category.items.length, 0),
    [checklist]
  );

  const completedCount = useMemo(
    () => checklist.reduce((count, category) => count + category.items.filter((item) => item.condition).length, 0),
    [checklist]
  );

  const progressPercent = totalRows ? Math.round((completedCount / totalRows) * 100) : 0;

  const issueCounts = useMemo(() => {
    const counts = { open: 0, inProgress: 0, resolved: 0 };
    checklist.forEach((category) => {
      category.items.forEach((item) => {
        if (item.condition === "Faulty") {
          if (item.issue.status === "In Progress") counts.inProgress += 1;
          else if (item.issue.status === "Resolved") counts.resolved += 1;
          else counts.open += 1;
        }
      });
    });
    return counts;
  }, [checklist]);

  const summaryTotals = useMemo(() => {
    const totals = { good: 0, faulty: 0, na: 0 };
    checklist.forEach((category) => {
      category.items.forEach((item) => {
        if (item.condition === "Good") totals.good += 1;
        if (item.condition === "Faulty") totals.faulty += 1;
        if (item.condition === "N.A.") totals.na += 1;
      });
    });
    return totals;
  }, [checklist]);

  const appendixEntries = useMemo(
    () => buildAppendixEntriesFromChecklist(checklist, selectedLevelName),
    [checklist, selectedLevelName]
  );

  const updateChecklistItem = (categoryId, itemId, changes) => {
    if (Object.prototype.hasOwnProperty.call(changes, "condition")) {
      setInspectionSubmitError("");
    }

    setChecklistForSelectedLevel((current) =>
      current.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          items: category.items.map((item) => {
            if (item.id !== itemId) return item;
            const updated = { ...item };
            Object.entries(changes).forEach(([key, value]) => {
              if (key.includes(".")) {
                const [parent, child] = key.split(".");
                updated[parent] = {
                  ...updated[parent],
                  [child]: value
                };
              } else {
                updated[key] = value;
              }
            });
            if (changes.condition === "Faulty") {
              updated.expanded = true;
              updated.issue = {
                ...updated.issue,
                status: "Open"
              };
            }
            return updated;
          })
        };
      })
    );
  };

  const toggleCategory = (categoryId) => {
    setChecklistForSelectedLevel((current) =>
      current.map((category) =>
        category.id === categoryId ? { ...category, expanded: !category.expanded } : category
      )
    );
  };

  const toggleRow = (categoryId, itemId) => {
    setChecklistForSelectedLevel((current) =>
      current.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          items: category.items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, expanded: !item.expanded };
          })
        };
      })
    );
  };

  const handlePhotoChange = (categoryId, itemId, files) => {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length === 0) return;

    setChecklistForSelectedLevel((current) =>
      current.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          items: category.items.map((item) => {
            if (item.id !== itemId) return item;
            const existingCount = uniqueValues([...(item.defectPhotoUrls || []), item.photo]).length;
            const remaining = Math.max(PHOTO_LIMIT - existingCount - (item.photoFiles || []).length, 0);
            const acceptedFiles = selectedFiles.slice(0, remaining);
            return {
              ...item,
              photoFiles: [...(item.photoFiles || []), ...acceptedFiles],
              photoPreviews: [
                ...(item.photoPreviews || []),
                ...acceptedFiles.map((file) => URL.createObjectURL(file))
              ],
              photoPreview: ""
            };
          })
        };
      })
    );
  };

  const removePhoto = (categoryId, itemId, photoIndex = 0) => {
    setChecklistForSelectedLevel((current) =>
      current.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          items: category.items.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              photoFiles: (item.photoFiles || []).filter((_, index) => index !== photoIndex),
              photoPreviews: (item.photoPreviews || []).filter((_, index) => index !== photoIndex),
              photoPreview: "",
              photoFile: null
            };
          })
        };
      })
    );
  };

  const handleFixProofPhotoChange = (files) => {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length === 0) {
      setFixProofPhotoFile([]);
      setFixProofPhotoPreview([]);
      return;
    }

    const currentFiles = Array.isArray(fixProofPhotoFile) ? fixProofPhotoFile : fixProofPhotoFile ? [fixProofPhotoFile] : [];
    const currentPreviews = Array.isArray(fixProofPhotoPreview) ? fixProofPhotoPreview : fixProofPhotoPreview ? [fixProofPhotoPreview] : [];
    const remaining = Math.max(PHOTO_LIMIT - getFixPhotoUrls(verificationIssue).length - currentFiles.length, 0);
    const acceptedFiles = selectedFiles.slice(0, remaining);
    setFixProofPhotoFile([...currentFiles, ...acceptedFiles]);
    setFixProofPhotoPreview([...currentPreviews, ...acceptedFiles.map((file) => URL.createObjectURL(file))]);
  };

  const handleIssueUpdate = (categoryId, itemId, changes) => {
    setChecklistForSelectedLevel((current) =>
      current.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          items: category.items.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              issue: {
                ...item.issue,
                ...changes
              }
            };
          })
        };
      })
    );

    if (Object.prototype.hasOwnProperty.call(changes, "status")) {
      window.setTimeout(() => saveChecklistItem(categoryId, itemId), 0);
    }
  };

  const saveChecklistItem = async (categoryId, itemId) => {
    if (!canSaveInspection || inspectionSubmitting) return;
    const category = checklist.find((itemCategory) => itemCategory.id === categoryId);
    const item = category?.items.find((checklistItem) => checklistItem.id === itemId);
    if (!category || !item) return;

    try {
      setInspectionSubmitting(true);
      setInspectionSubmitError("");
      setInspectionSubmitSuccess("");

      const created = await upsertInspection({
        inspectionKey,
        inspectionId: inspectionKey,
        buildingId: selectedBuilding,
        floorId: selectedLevel,
        floorName: selectedLevelName,
        fsmId,
        periodKey,
        inspectionType: "Monthly Inspection",
        inspectionMode: "Semi-Automated",
        templateId: null,
        inspectionDate: new Date(),
        progressPercent,
        generalRemarks,
        aiAssistanceUsed: false,
        aiSummary: "",
        status: "Draft"
      });

      const resultKey = buildRecordKey(inspectionKey, category.id, item.id);
      const isFaultyItem = item.condition === "Faulty";
      const issueKey = isFaultyItem ? resultKey : "";
      let defectPhotoUrls = uniqueValues([...(item.defectPhotoUrls || []), item.photo]).slice(0, PHOTO_LIMIT);
      let photoUrl = defectPhotoUrls[0] || "";
      let defectPhotoStoragePath = item.defectPhotoStoragePath || "";
      let defectPhotoUploadedAt = item.defectPhotoUploadedAt || null;
      let defectPhotoUploadedBy = item.defectPhotoUploadedBy || "";
      const selectedPhotoFiles = [
        ...(item.photoFiles || []),
        ...(item.photoFile ? [item.photoFile] : [])
      ].slice(0, Math.max(PHOTO_LIMIT - defectPhotoUrls.length, 0));

      if (selectedPhotoFiles.length > 0 && isFaultyItem) {
        const uploadedPhotos = [];
        for (const file of selectedPhotoFiles) {
          const uploaded = await uploadFile(
            file,
            getInspectionDefectPhotoFolder({ inspectionKey, categoryId: category.id, itemId: item.id })
          );
          if (uploaded?.url) uploadedPhotos.push(uploaded);
        }
        defectPhotoUrls = uniqueValues([...defectPhotoUrls, ...uploadedPhotos.map((photo) => photo.url)]).slice(0, PHOTO_LIMIT);
        photoUrl = defectPhotoUrls[0] || "";
        defectPhotoStoragePath = uploadedPhotos[uploadedPhotos.length - 1]?.path || "";
        defectPhotoUploadedAt = new Date();
        defectPhotoUploadedBy = fsmId;
      }

      const result = await upsertInspectionResult({
        resultKey,
        resultId: resultKey,
        inspectionKey,
        inspectionId: created.id,
        buildingId: selectedBuilding,
        floorId: selectedLevel,
        floorName: selectedLevelName,
        fsmId,
        periodKey,
        equipmentId: null,
        templateId: null,
        categoryCode: category.id,
        categoryName: category.title,
        itemCode: item.code,
        itemLabel: item.label,
        inspectionPath: `${buildingName} > ${selectedLevelName} > ${item.label}`,
        condition: item.condition || "",
        passFail: getPassFail(item.condition),
        remark: item.remark || "",
        photoUrl,
        defectPhotoUrl: photoUrl,
        defectPhotoUrls,
        defectPhotoStoragePath,
        defectPhotoUploadedAt,
        defectPhotoUploadedBy,
        issueDescription: item.issue?.description || "",
        rectification: item.issue?.rectification || "",
        priority: item.issue?.priority || "",
        issueStatus: item.issue?.status || "",
        manualVerificationRequired: !!item.isManualVerification,
        checkedAt: new Date(),
        checkedBy: fsmId,
        qrScanned: false,
        qrCodeValue: "",
        historyLoaded: false,
        aiChecklistSuggestion: ""
      });

      if (isFaultyItem) {
        const existingIssue = await getIssueById(issueKey);
        const historyEntries = [];
        if (!existingIssue) {
          historyEntries.push(createAuditEntry({
            status: item.issue?.status || ISSUE_STATUS.OPEN,
            note: item.issue?.description || item.remark || "Auto created from checklist",
            updatedBy: fsmId,
            eventType: "issue_created"
          }));
        } else if (String(existingIssue.status || "") !== String(item.issue?.status || "")) {
          historyEntries.push(createAuditEntry({
            status: item.issue?.status || ISSUE_STATUS.OPEN,
            note: item.issue?.rectification || item.issue?.description || item.remark || "",
            updatedBy: fsmId,
            eventType: "status_update"
          }));
        }
        if (selectedPhotoFiles.length > 0) {
          historyEntries.push(createAuditEntry({
            status: item.issue?.status || ISSUE_STATUS.OPEN,
            note: `${selectedPhotoFiles.length} defect photo(s) uploaded`,
            updatedBy: fsmId,
            eventType: "photos_uploaded"
          }));
        }

        await upsertIssue({
          issueKey,
          issueId: issueKey,
          inspectionKey,
          inspectionId: created.id,
          resultKey,
          resultId: result.id || resultKey,
          buildingId: selectedBuilding,
          floorId: selectedLevel,
          floorName: selectedLevelName,
          categoryCode: category.id,
          itemCode: item.code,
          itemLabel: item.label,
          location: selectedLevelName,
          equipmentId: null,
          reportedBy: fsmId,
          issueTitle: item.label,
          issueDescription: item.issue?.description || item.remark || "",
          rectification: item.issue?.rectification || "",
          priority: item.issue?.priority || "High",
          status: item.issue?.status || ISSUE_STATUS.OPEN,
          issuePhotoUrl: photoUrl,
          defectPhotoUrl: photoUrl,
          defectPhotoUrls,
          defectPhotoStoragePath,
          defectPhotoUploadedAt,
          defectPhotoUploadedBy,
          aiRecommendation: "",
          ...(historyEntries.length ? { history: appendHistory(existingIssue, historyEntries) } : {})
        });
      }

      setInspectionSubmitSuccess(`${item.code} saved successfully.`);
    } catch (err) {
      console.error("Checklist item save failed", err);
      setInspectionSubmitError(err.message || "Could not save checklist item.");
    } finally {
      setInspectionSubmitting(false);
    }
  };

  const openChecklistIssueVerification = async (categoryId, item) => {
    const issueKey = buildRecordKey(inspectionKey, categoryId, item.id);
    await saveChecklistItem(categoryId, item.id);
    navigate(`/fsm/inspections/verify?issueId=${encodeURIComponent(issueKey)}`);
  };

  const resolveVerificationIssue = async () => {
    if (!verificationIssue || inspectionSubmitting) return;

    const issueKey = verificationIssue.issueKey || verificationIssue.id || verificationIssue.issueId;
    const selectedFixPhotoFiles = Array.isArray(fixProofPhotoFile)
      ? fixProofPhotoFile
      : fixProofPhotoFile
        ? [fixProofPhotoFile]
        : [];

    if (selectedFixPhotoFiles.length === 0 && getFixPhotoUrls(verificationIssue).length === 0) {
      setInspectionSubmitError("Please upload a fix/resolution photo before marking this issue as resolved.");
      return;
    }

    if (!window.confirm("Verify closure and close this issue? Please confirm the defect has been fixed and accepted.")) {
      return;
    }

    try {
      setInspectionSubmitting(true);
      setInspectionSubmitError("");
      setInspectionSubmitSuccess("");

      let fixPhotoUrl = getFixPhotoUrl(verificationIssue);
      let fixPhotoStoragePath = verificationIssue.fixPhotoStoragePath || "";
      let fixPhotoUploadedAt = verificationIssue.fixPhotoUploadedAt || null;
      let fixPhotoUploadedBy = verificationIssue.fixPhotoUploadedBy || "";
      let fixPhotoUrls = getFixPhotoUrls(verificationIssue);

      const uploadedFixPhotos = [];
      for (const file of selectedFixPhotoFiles.slice(0, Math.max(PHOTO_LIMIT - fixPhotoUrls.length, 0))) {
        const uploaded = await uploadFile(file, `closure-verifications/${issueKey}`);
        if (uploaded?.url) uploadedFixPhotos.push(uploaded);
      }

      if (uploadedFixPhotos.length) {
        fixPhotoUrls = uniqueValues([...fixPhotoUrls, ...uploadedFixPhotos.map((photo) => photo.url)]).slice(0, PHOTO_LIMIT);
        fixPhotoUrl = fixPhotoUrls[0] || fixPhotoUrl;
        fixPhotoStoragePath = uploadedFixPhotos[uploadedFixPhotos.length - 1].path || "";
        fixPhotoUploadedAt = new Date();
        fixPhotoUploadedBy = fsmId;
      }

      await addClosureVerification({
        verificationId: `closure-${issueKey}-${Date.now()}`,
        issueId: issueKey,
        resultId: verificationIssue.resultId || verificationIssue.resultKey || "",
        verifiedBy: fixPhotoUploadedBy || fsmId,
        beforePhotoUrl: getDefectPhotoUrl(verificationIssue),
        afterPhotoUrl: fixPhotoUrl,
        defectPhotoUrl: getDefectPhotoUrl(verificationIssue),
        defectPhotoUrls: getDefectPhotoUrls(verificationIssue),
        defectPhotoStoragePath: verificationIssue.defectPhotoStoragePath || "",
        defectPhotoUploadedAt: verificationIssue.defectPhotoUploadedAt || null,
        defectPhotoUploadedBy: verificationIssue.defectPhotoUploadedBy || "",
        fixPhotoUrl,
        fixPhotoUrls,
        fixPhotoStoragePath,
        fixPhotoUploadedAt,
        fixPhotoUploadedBy,
        verificationComments: verificationIssue.rectification || "",
        approvalStatus: APPROVAL_STATUS.APPROVED
      });

      await upsertIssue({
        ...verificationIssue,
        issueKey,
        issueId: verificationIssue.issueId || issueKey,
        reportedBy: verificationIssue.reportedBy || fsmId,
        status: ISSUE_STATUS.CLOSED,
        defectPhotoUrl: getDefectPhotoUrl(verificationIssue),
        defectPhotoUrls: getDefectPhotoUrls(verificationIssue),
        defectPhotoStoragePath: verificationIssue.defectPhotoStoragePath || "",
        defectPhotoUploadedAt: verificationIssue.defectPhotoUploadedAt || null,
        defectPhotoUploadedBy: verificationIssue.defectPhotoUploadedBy || "",
        fixPhotoUrl,
        fixPhotoUrls,
        fixPhotoStoragePath,
        fixPhotoUploadedAt,
        fixPhotoUploadedBy,
        history: appendHistory(verificationIssue, [
          uploadedFixPhotos.length
            ? createAuditEntry({
                status: ISSUE_STATUS.RESOLVED,
                note: `${uploadedFixPhotos.length} after-repair photo(s) uploaded`,
                updatedBy: fsmId,
                eventType: "photos_uploaded"
              })
            : null,
          createAuditEntry({
            status: ISSUE_STATUS.CLOSED,
            note: verificationIssue.rectification || "Verified and accepted",
            updatedBy: fsmId,
            eventType: "status_update"
          })
        ])
      });

      setVerificationIssue((current) => ({
        ...current,
        status: ISSUE_STATUS.CLOSED,
        fixPhotoUrl,
        fixPhotoUrls,
        fixPhotoStoragePath,
        fixPhotoUploadedAt,
        fixPhotoUploadedBy
      }));
      setFixProofPhotoFile([]);
      setFixProofPhotoPreview([]);
      setInspectionSubmitSuccess("Verification submitted and issue closed successfully.");
    } catch (err) {
      console.error("Issue resolution failed", err);
      setInspectionSubmitError(err.message || "Could not mark issue as resolved.");
    } finally {
      setInspectionSubmitting(false);
    }
  };

  const persistInspection = async (status) => {
    if (!canSaveInspection || inspectionSubmitting) return;

    setInspectionSubmitSuccess("");
    const unansweredItem = findFirstUnansweredChecklistItem(checklist);
    if (status === "Submitted" && unansweredItem) {
      setInspectionSubmitError("Please answer every checklist row with Good, Faulty, or N.A. before submitting.");
      setChecklistForSelectedLevel((current) =>
        current.map((category) => ({
          ...category,
          expanded: category.id === unansweredItem.category.id ? true : category.expanded,
          items: category.items.map((item) =>
            item.id === unansweredItem.item.id ? { ...item, expanded: true } : item
          )
        }))
      );

      window.setTimeout(() => {
        document
          .getElementById(getIssueRowDomId(unansweredItem.category.id, unansweredItem.item.id))
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }

    if (status === "Submitted") {
      if (!window.confirm("Submit this inspection checklist? This will save the inspection results and defect evidence.")) {
        return;
      }
    }

    try {
      setInspectionSubmitting(true);
      setInspectionSubmitError("");
      const created = await upsertInspection({
        inspectionKey,
        inspectionId: inspectionKey,
        buildingId: selectedBuilding,
        floorId: selectedLevel,
        floorName: selectedLevelName,
        fsmId,
        periodKey,
        inspectionType: "Monthly Inspection",
        inspectionMode: "Semi-Automated",
        templateId: null,
        inspectionDate: new Date(),
        progressPercent,
        generalRemarks,
        aiAssistanceUsed: false,
        aiSummary: "",
        status
      });

      for (const category of checklist) {
        for (const item of category.items) {
          const resultKey = buildRecordKey(inspectionKey, category.id, item.id);
          const isFaultyItem = item.condition === "Faulty";
          const issueKey = isFaultyItem ? buildRecordKey(inspectionKey, category.id, item.id) : "";
          let photoUrl = item.photo || "";
          let defectPhotoUrls = uniqueValues([...(item.defectPhotoUrls || []), item.photo]).slice(0, PHOTO_LIMIT);
          let defectPhotoStoragePath = item.defectPhotoStoragePath || "";
          let defectPhotoUploadedAt = item.defectPhotoUploadedAt || null;
          let defectPhotoUploadedBy = item.defectPhotoUploadedBy || "";
          const selectedPhotoFiles = [
            ...(item.photoFiles || []),
            ...(item.photoFile ? [item.photoFile] : [])
          ].slice(0, Math.max(PHOTO_LIMIT - defectPhotoUrls.length, 0));

          if (selectedPhotoFiles.length > 0 && isFaultyItem) {
            const uploadedPhotos = [];
            for (const file of selectedPhotoFiles) {
              const uploaded = await uploadFile(
                file,
                getInspectionDefectPhotoFolder({
                  inspectionKey,
                  categoryId: category.id,
                  itemId: item.id
                })
              );
              if (uploaded?.url) uploadedPhotos.push(uploaded);
            }
            defectPhotoUrls = uniqueValues([...defectPhotoUrls, ...uploadedPhotos.map((photo) => photo.url)]).slice(0, PHOTO_LIMIT);
            photoUrl = defectPhotoUrls[0] || photoUrl;
            defectPhotoStoragePath = uploadedPhotos[uploadedPhotos.length - 1]?.path || "";
            defectPhotoUploadedAt = new Date();
            defectPhotoUploadedBy = fsmId;
          } else if (selectedPhotoFiles.length > 0) {
            console.warn("Skipped non-faulty checklist photo upload", {
              resultKey,
              itemCode: item.code,
              condition: item.condition
            });
          }

          const defectPhotoUrl = photoUrl;

          const result = await upsertInspectionResult({
            resultKey,
            resultId: resultKey,
            inspectionKey,
            inspectionId: created.id,
            buildingId: selectedBuilding,
            floorId: selectedLevel,
            floorName: selectedLevelName,
            fsmId,
            periodKey,
            equipmentId: null,
            templateId: null,
            categoryCode: category.id,
            categoryName: category.title,
            itemCode: item.code,
            itemLabel: item.label,
            inspectionPath: `${buildingName} > ${selectedLevelName} > ${item.label}`,
            condition: item.condition || "",
            passFail: getPassFail(item.condition),
            remark: item.remark || "",
            photoUrl,
            defectPhotoUrl,
            defectPhotoUrls,
            defectPhotoStoragePath,
            defectPhotoUploadedAt,
            defectPhotoUploadedBy,
            issueDescription: item.issue?.description || "",
            rectification: item.issue?.rectification || "",
            priority: item.issue?.priority || "",
            issueStatus: item.issue?.status || "",
            manualVerificationRequired: !!item.isManualVerification,
            checkedAt: new Date(),
            checkedBy: fsmId,
            qrScanned: false,
            qrCodeValue: "",
            historyLoaded: false,
            aiChecklistSuggestion: ""
          });

          // eslint-disable-next-line no-console
          console.log("Saved inspection result doc", {
            inspectionDocId: created.id,
            inspectionKey,
            resultDocId: result.id,
            resultKey,
            defectPhotoUrl,
            defectPhotoStoragePath
          });

          if (status === "Submitted" && isFaultyItem) {
            const existingIssue = await getIssueById(issueKey);
            const historyEntries = [];
            if (!existingIssue) {
              historyEntries.push(createAuditEntry({
                status: item.issue?.status || ISSUE_STATUS.OPEN,
                note: item.issue?.description || item.remark || "Auto created from checklist",
                updatedBy: fsmId,
                eventType: "issue_created"
              }));
            } else if (String(existingIssue.status || "") !== String(item.issue?.status || "")) {
              historyEntries.push(createAuditEntry({
                status: item.issue?.status || ISSUE_STATUS.OPEN,
                note: item.issue?.rectification || item.issue?.description || item.remark || "",
                updatedBy: fsmId,
                eventType: "status_update"
              }));
            }
            if (selectedPhotoFiles.length > 0) {
              historyEntries.push(createAuditEntry({
                status: item.issue?.status || ISSUE_STATUS.OPEN,
                note: `${selectedPhotoFiles.length} defect photo(s) uploaded`,
                updatedBy: fsmId,
                eventType: "photos_uploaded"
              }));
            }
            await upsertIssue({
              issueKey,
              issueId: issueKey,
              inspectionKey,
              inspectionId: created.id,
              resultKey,
              resultId: result.id || resultKey,
              buildingId: selectedBuilding,
              floorId: selectedLevel,
              floorName: selectedLevelName,
              categoryCode: category.id,
              itemCode: item.code,
              itemLabel: item.label,
              location: selectedLevelName,
              equipmentId: null,
              reportedBy: fsmId,
              issueTitle: item.label,
              issueDescription: item.issue?.description || item.remark || "",
              rectification: item.issue?.rectification || "",
              priority: item.issue?.priority || "High",
              status: item.issue?.status || ISSUE_STATUS.OPEN,
              issuePhotoUrl: photoUrl,
              defectPhotoUrl,
              defectPhotoUrls,
              defectPhotoStoragePath,
              defectPhotoUploadedAt,
              defectPhotoUploadedBy,
              fixPhotoUrl: verificationIssue?.fixPhotoUrl || "",
              fixPhotoUrls: getFixPhotoUrls(verificationIssue),
              fixPhotoStoragePath: verificationIssue?.fixPhotoStoragePath || "",
              fixPhotoUploadedAt: verificationIssue?.fixPhotoUploadedAt || null,
              fixPhotoUploadedBy: verificationIssue?.fixPhotoUploadedBy || "",
              aiRecommendation: "",
              ...(historyEntries.length ? { history: appendHistory(existingIssue, historyEntries) } : {})
            });
          }
        }
      }

      if (status === "Submitted") {
        const reportDocumentId = buildRecordKey("report", inspectionKey);
        const reportId = `REP-${periodKey}-${selectedLevelName}`.replace(/\s+/g, "-");
        const hasDefects = issueCounts.open + issueCounts.inProgress + issueCounts.resolved > 0;

        await upsertReport(reportDocumentId, {
          reportId,
          reportType: "Monthly",
          inspectionId: created.id,
          buildingId: selectedBuilding,
          generatedBy: fsmId,
          generatedDate: new Date(),
          reportTitle: `Monthly Report - ${currentInspectionInfo.month} - ${buildingName} - ${selectedLevelName}`,
          period: currentInspectionInfo.month,
          priority: hasDefects ? "High" : "Normal",
          status: REPORT_STATUS.SUBMITTED
        });
      }

      // eslint-disable-next-line no-console
      console.log(`Inspection ${status.toLowerCase()}`, created.id);
      setInspectionSubmitSuccess(
        status === "Submitted"
          ? "Inspection checklist submitted and monthly report record created successfully."
          : "Inspection checklist saved successfully."
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`${status} inspection failed`, err);
      setInspectionSubmitError(err.message || `Could not ${status.toLowerCase()} inspection.`);
    } finally {
      setInspectionSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isVerifyMode && verificationIssue) {
      await resolveVerificationIssue();
      return;
    }

    await persistInspection("Submitted");
  };

  return (
    <main className="inspection-page">
      <section className="page-header">
        <div>
          <p className="eyebrow">{isVerifyMode ? "Verify Resolution" : "Inspections"}</p>
          <h1>{isVerifyMode ? "Verify Issue Resolution" : "Monthly inspection report"}</h1>
          <p className="page-subtitle">
            {isVerifyMode
              ? "Review the linked checklist row, update the current condition, and submit the verification."
              : "Complete monthly fire safety checks by category and submit once finished."}
          </p>
        </div>
      </section>

      {!isVerifyMode && (
        <div className="inspection-floating-submit" role="complementary" aria-label="Inspection submit action">
          <span>{completedCount} / {totalRows} completed</span>
          <button
            type="button"
            className="primary-button"
            onClick={handleSubmit}
            disabled={!canSaveInspection || inspectionSubmitting}
          >
            {inspectionSubmitting ? "Submitting..." : "Submit Inspection"}
          </button>
        </div>
      )}

      <div className="inspection-grid inspection-grid--single">
        <div className="inspection-main inspection-main--wide">
          {isVerifyMode && (
            <section className="inspection-card verification-banner">
              <div>
                <p className="overline">Issue Verification</p>
                <h3>{verificationIssue?.issueTitle || verificationIssue?.itemLabel || "Selected issue"}</h3>
                <p className="hint-text">{verificationIssue?.issueDescription || verificationIssueError || "Loading linked issue details..."}</p>
              </div>
              <div className="verification-banner-grid">
                <span>Status <strong>{verificationIssue?.status || "-"}</strong></span>
                <span>Building <strong>{buildingName}</strong></span>
                <span>Level <strong>{verificationIssue?.floorName || selectedLevelName || "-"}</strong></span>
                <span>Rectification <strong>{verificationIssue?.rectification || "-"}</strong></span>
              </div>
              {(getDefectPhotoUrls(verificationIssue).length > 0 || getFixPhotoUrls(verificationIssue).length > 0 || (Array.isArray(fixProofPhotoPreview) ? fixProofPhotoPreview.length : fixProofPhotoPreview)) && (
                <div className="verification-photo-grid">
                  {getDefectPhotoUrls(verificationIssue).map((photoUrl, index) => (
                    <figure key={`before-${photoUrl}-${index}`} className="verification-photo">
                      <figcaption>Before {index + 1}</figcaption>
                      <img src={photoUrl} alt={`Original defect evidence ${index + 1}`} />
                    </figure>
                  ))}
                  {[...getFixPhotoUrls(verificationIssue), ...(Array.isArray(fixProofPhotoPreview) ? fixProofPhotoPreview : fixProofPhotoPreview ? [fixProofPhotoPreview] : [])]
                    .slice(0, PHOTO_LIMIT)
                    .map((photoUrl, index) => (
                      <figure key={`after-${photoUrl}-${index}`} className="verification-photo">
                        <figcaption>After {index + 1}</figcaption>
                        <img src={photoUrl} alt={`Closure evidence ${index + 1}`} />
                      </figure>
                    ))}
                </div>
              )}
              {isVerifyMode && verificationIssue && (
                <div className="verification-action-row">
                  <label className="verification-fix-photo-upload">
                    <span>Fix/resolution photos (max 3)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={getFixPhotoUrls(verificationIssue).length + (Array.isArray(fixProofPhotoPreview) ? fixProofPhotoPreview.length : fixProofPhotoPreview ? 1 : 0) >= PHOTO_LIMIT}
                      onChange={(event) => handleFixProofPhotoChange(event.target.files)}
                    />
                  </label>
                  <button
                    type="button"
                    className="primary-button compact-action-button"
                    onClick={handleSubmit}
                    disabled={!verificationIssue || !fsmId || inspectionSubmitting}
                  >
                    {inspectionSubmitting ? "Closing..." : "Close Issue"}
                  </button>
                </div>
              )}
            </section>
          )}
          {inspectionSubmitError && (
            <div className="error-state" style={{ marginBottom: "18px" }}>
              {inspectionSubmitError}
            </div>
          )}
          {inspectionSubmitSuccess && (
            <div className="success-state" style={{ marginBottom: "18px" }}>
              {inspectionSubmitSuccess}
            </div>
          )}
          <InspectionOverview
            completedCount={completedCount}
            totalRows={totalRows}
            progressPercent={progressPercent}
            inspectionInfo={currentInspectionInfo}
            buildingName={buildingName}
            assignmentLoading={assignmentLoading}
            assignmentError={assignmentError}
            levels={levels}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
          />
          <IssueSummary
            openCount={issueCounts.open}
            inProgressCount={issueCounts.inProgress}
            resolvedCount={issueCounts.resolved}
          />

          <section className="inspection-card checklist-card">
            <div className="card-title-row">
              <div>
                <p className="overline">Checklist</p>
                <h3>Inspection categories</h3>
              </div>
              <p className="hint-text">Open any section to review items and capture defects directly on screen.</p>
            </div>
            <div className="category-list">
              {checklist.map((category) => (
                <div className="category-card" key={category.id}>
                  <button
                    type="button"
                    className="category-header"
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={category.expanded}
                  >
                    <div>
                      <p className="category-title">{category.title}</p>
                      <p className="category-description">{category.description}</p>
                    </div>
                    <span className="category-count">
                      {category.items.filter((item) => item.condition).length} / {category.items.length}
                    </span>
                  </button>
                  {category.expanded && (
                    <div className="category-body">
                      {category.id === "encroachment" ? (
                        <div className="encroachment-table-wrapper">
                          <div className="encroachment-header-row">
                            <span>Storey</span>
                            <span>General Condition</span>
                            <span>Location</span>
                            <span>Remarks</span>
                          </div>
                          {category.items.map((item) => (
                            <div
                              className="encroachment-row"
                              id={getIssueRowDomId(category.id, item.id)}
                              key={item.id}
                            >
                              <span>{item.storey === "All" ? selectedLevelName || "All" : item.storey}</span>
                              <select
                                className={getConditionClass(item.condition)}
                                value={item.condition}
                                onChange={(e) => updateChecklistItem(category.id, item.id, { condition: e.target.value })}
                              >
                                <option value="">Select condition</option>
                                {conditionOptions.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                              <span>{item.location}</span>
                              <input
                                type="text"
                                value={item.remark}
                                placeholder="Remark"
                                onChange={(e) => updateChecklistItem(category.id, item.id, { remark: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        category.items.map((item) => (
                          <FaultProofChecklistRow
                            key={item.id}
                            item={item}
                            categoryId={category.id}
                            isHighlighted={isVerifyMode && isIssueTargetRow(verificationIssue, category, item)}
                            isVerifyMode={isVerifyMode}
                            onUpdate={updateChecklistItem}
                            onPhotoChange={handlePhotoChange}
                            onIssueUpdate={handleIssueUpdate}
                            onToggle={toggleRow}
                            onRemovePhoto={removePhoto}
                            onVerifyClosure={openChecklistIssueVerification}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="inspection-card summary-card-bottom">
            <div className="card-title-row">
              <p className="overline">Summary</p>
              <h3>Checklist totals</h3>
            </div>
            <div className="summary-stat-grid">
              <div className="summary-stat good">
                <span>Good</span>
                <strong>{summaryTotals.good}</strong>
              </div>
              <div className="summary-stat faulty">
                <span>Faulty</span>
                <strong>{summaryTotals.faulty}</strong>
              </div>
              <div className="summary-stat remaining">
                <span>N.A.</span>
                <strong>{summaryTotals.na}</strong>
              </div>
            </div>
          </section>

          <AppendixTable entries={appendixEntries} />

          <section className="inspection-card remarks-card">
            <div className="card-title-row">
              <p className="overline">General Observation</p>
              <h3>Remarks</h3>
            </div>
            <label>
              <span className="sr-only">General observation and remarks</span>
              <textarea
                value={generalRemarks}
                rows={5}
                placeholder="Add general observation or notes for this inspection..."
                onChange={(e) => setRemarksForSelectedLevel(e.target.value)}
              />
            </label>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Inspections;
