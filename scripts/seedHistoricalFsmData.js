/*
 * One-time, idempotent development seed for January-May 2026.
 * Uses the current Firebase CLI login and the existing Firestore schema.
 * Run: npm run seed:fsm-history
 * Optional: npm run seed:fsm-history -- --building=DOCUMENT_ID
 */
const fs = require("fs");
const path = require("path");
const { checklist, findings, inspectionDates } = require("./historicalFsmFixtures");

const projectId = "fireguardcbre";
const seedSource = "historical-fsm-2026-v1";
const apiRoot = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const documentRoot = `projects/${projectId}/databases/(default)/documents`;

const fieldValue = (input) => {
  if (input === null) return { nullValue: null };
  if (input instanceof Date) return { timestampValue: input.toISOString() };
  if (Array.isArray(input)) return { arrayValue: { values: input.map(fieldValue) } };
  if (typeof input === "boolean") return { booleanValue: input };
  if (typeof input === "number") return Number.isInteger(input) ? { integerValue: String(input) } : { doubleValue: input };
  if (typeof input === "object") return { mapValue: { fields: encodeFields(input) } };
  return { stringValue: String(input) };
};

const encodeFields = (object) => Object.fromEntries(
  Object.entries(object).filter(([, value]) => value !== undefined).map(([key, value]) => [key, fieldValue(value)])
);

const decodeValue = (value) => {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("booleanValue" in value) return value.booleanValue;
  if (value.arrayValue) return (value.arrayValue.values || []).map(decodeValue);
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decodeValue(item)]));
  return null;
};

const decodeDocument = (document) => ({
  id: document.name.split("/").pop(),
  ...Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, decodeValue(value)]))
});

const getAccessToken = () => {
  const configPath = path.join(process.env.USERPROFILE || "", ".config", "configstore", "firebase-tools.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!config.tokens?.access_token) throw new Error("Firebase CLI login not found. Run `firebase login` first.");
  return config.tokens.access_token;
};

const request = async (url, token, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response.json();
};

const listCollection = async (name, token) => {
  const response = await request(`${apiRoot}/${name}?pageSize=300`, token);
  return (response.documents || []).map(decodeDocument);
};

const timestamp = (dateText, time = "09:30:00") => new Date(`${dateText}T${time}+08:00`);
const addDays = (date, days) => new Date(date.getTime() + days * 86400000);
const cleanId = (value) => String(value).replace(/[^a-zA-Z0-9_-]+/g, "-");

const historyFor = (createdAt, resolvedAt, status, fsmId, description, rectification) => {
  const history = [{ status: "Open", note: description, updatedBy: fsmId, updatedAt: createdAt, eventType: "issue_created" }];
  if (status !== "Open") history.push({ status: "In Progress", note: "Rectification work assigned.", updatedBy: fsmId, updatedAt: addDays(createdAt, 1), eventType: "status_update" });
  if (["Resolved", "Closed"].includes(status)) history.push({ status: "Resolved", note: rectification, updatedBy: fsmId, updatedAt: resolvedAt, eventType: "status_update" });
  if (status === "Closed") history.push({ status: "Closed", note: "FSM inspected and accepted the completed rectification.", updatedBy: fsmId, updatedAt: addDays(resolvedAt, 1), eventType: "status_update" });
  return history;
};

const write = (collection, id, data) => ({
  update: { name: `${documentRoot}/${collection}/${id}`, fields: encodeFields(data) }
});

const buildWrites = (building, fsmId) => {
  const writes = [];
  const buildingName = building.buildingName || building.building_name || building.name || building.id;
  const floors = Math.max(1, Math.min(Number(building.noOfStoreys) || 3, 3));

  inspectionDates.forEach((dateText, index) => {
    const createdAt = timestamp(dateText);
    const submittedAt = addDays(createdAt, 0.2);
    const periodKey = dateText.slice(0, 7);
    const floorId = `level-${index % floors + 1}`;
    const floorName = `Level ${index % floors + 1}`;
    const inspectionKey = `seed-hist-${cleanId(building.id)}-${dateText}`;
    const [faultCategory, faultCode, title, description, rectification, priority, status, resolutionDays] = findings[index];
    const issueKey = `${inspectionKey}__${faultCategory}__${faultCode}`;
    const resolvedAt = resolutionDays ? addDays(createdAt, resolutionDays) : null;

    writes.push(write("inspections", inspectionKey, {
      inspectionKey, inspectionId: inspectionKey, buildingId: building.id, floorId, floorName, fsmId, periodKey,
      inspectionType: "Monthly Inspection", inspectionMode: "Semi-Automated", templateId: null,
      inspectionDate: createdAt, progressPercent: 100,
      generalRemarks: `Monthly inspection completed for ${floorName}. One finding was recorded for follow-up.`,
      appendixFindings: [{ itemCode: faultCode, location: floorName, finding: description, rectification }],
      aiAssistanceUsed: false, aiSummary: "", status: "Submitted", submittedAt,
      createdAt, updatedAt: submittedAt, lastUpdated: submittedAt, seedSource
    }));

    checklist.forEach(([categoryCode, categoryName, itemCode, itemLabel], itemIndex) => {
      const faulty = categoryCode === faultCategory && itemCode === faultCode;
      const notApplicable = !faulty && (itemIndex + index) % 11 === 0;
      const condition = faulty ? "Faulty" : notApplicable ? "N.A." : "Good";
      const resultKey = `${inspectionKey}__${categoryCode}__${itemCode}`;
      writes.push(write("inspectionResults", resultKey, {
        resultKey, resultId: resultKey, inspectionKey, inspectionId: inspectionKey, buildingId: building.id,
        floorId, floorName, fsmId, periodKey, equipmentId: null, templateId: null,
        categoryCode, categoryName, itemCode, itemLabel,
        inspectionPath: `${buildingName} > ${floorName} > ${itemLabel}`, condition,
        passFail: condition === "Good" ? "Pass" : condition === "Faulty" ? "Fail" : "N.A.",
        remark: faulty ? "Refer to appendix and linked issue." : notApplicable ? "Not applicable at this location." : "Checked and serviceable.",
        photoUrl: "", defectPhotoUrl: "", defectPhotoUrls: [], issueDescription: faulty ? description : "",
        rectification: faulty ? rectification : "", priority: faulty ? priority : "", issueStatus: faulty ? status : "",
        manualVerificationRequired: false, checkedAt: createdAt, checkedBy: fsmId, qrScanned: false,
        historyLoaded: false, createdAt, updatedAt: submittedAt, seedSource
      }));
    });

    const history = historyFor(createdAt, resolvedAt, status, fsmId, description, rectification);
    writes.push(write("issues", issueKey, {
      issueKey, issueId: issueKey, periodKey, reportedAt: createdAt, inspectionKey, inspectionId: inspectionKey,
      resultKey: issueKey, resultId: issueKey, buildingId: building.id, floorId, floorName,
      categoryCode: faultCategory, itemCode: faultCode, itemLabel: title, location: floorName,
      equipmentId: null, reportedBy: fsmId, issueTitle: title, issueDescription: description,
      rectification, priority, status, issuePhotoUrl: "", defectPhotoUrl: "", defectPhotoUrls: [],
      fixPhotoUrl: "", fixPhotoUrls: [], verificationComments: resolvedAt ? "Rectification checked and accepted." : "",
      history, resolvedAt: ["Resolved", "Closed"].includes(status) ? resolvedAt : null,
      closedAt: status === "Closed" ? addDays(resolvedAt, 1) : null,
      createdAt, updatedAt: history[history.length - 1].updatedAt, seedSource
    }));

    if (["Resolved", "Closed"].includes(status)) {
      const verifiedAt = status === "Closed" ? addDays(resolvedAt, 1) : resolvedAt;
      const verificationId = `seed-closure-${cleanId(building.id)}-${dateText}`;
      writes.push(write("closureVerifications", verificationId, {
        verificationId, issueId: issueKey, resultId: issueKey, verifiedBy: fsmId, approvedBy: fsmId,
        beforePhotoUrl: "", afterPhotoUrl: "", defectPhotoUrl: "", defectPhotoUrls: [], fixPhotoUrl: "", fixPhotoUrls: [],
        verificationComments: "Rectification inspected and accepted; item was serviceable at verification.",
        approvalStatus: "Approved", verifiedAt, createdAt: verifiedAt, updatedAt: verifiedAt, seedSource
      }));
    }

    const participants = 36 + index * 4;
    const drillId = `seed-drill-${cleanId(building.id)}-${dateText}`;
    writes.push(write("fireDrills", drillId, {
      buildingId: building.id, buildingName, fsmId, drillDate: dateText, drillTime: index % 2 ? "14:30" : "10:00",
      drillEndTime: index % 2 ? "14:50" : "10:20", evacuationType: index % 3 === 2 ? "Partial Evacuation" : "Full Evacuation",
      drillType: index % 3 === 1 ? "Tabletop Exercise" : "Evacuation Drill", scope: floorName,
      participants: String(participants), actualParticipants: String(participants), attendanceCount: participants,
      status: "Completed", performanceStatus: index === 3 ? "Completed with Follow-Up" : "Passed",
      actualDate: dateText, actualTime: index % 2 ? "14:30" : "10:00", conductedDate: dateText,
      alarmToEvacuationTime: `00:0${2 + index % 2}:15`, totalEvacuationTime: `00:0${4 + index % 3}:20`,
      evacuationTime: `00:0${4 + index % 3}:20`,
      observations: "Wardens swept assigned zones and occupants proceeded calmly to the assembly area.",
      issueFound: index === 3 ? "Assembly-area sign was difficult to see." : "No critical issue found.",
      followUpIssues: index === 3 ? "Assembly-area sign repositioned after the exercise." : "Nil",
      recommendations: "Continue regular warden briefings.", photos: [], photoUrls: [],
      reportStatus: "Submitted", customerComments: "", createdAt, updatedAt: submittedAt, completedAt: submittedAt, seedSource
    }));
  });
  return writes;
};

const main = async () => {
  const token = getAccessToken();
  const requestedBuilding = process.argv.find((item) => item.startsWith("--building="))?.split("=")[1];
  const [buildings, users] = await Promise.all([listCollection("buildings", token), listCollection("users", token)]);
  const building = buildings.find((item) => requestedBuilding ? item.id === requestedBuilding : Boolean(item.assignedFsmId));
  if (!building) throw new Error("No assigned building found. Use --building=DOCUMENT_ID or assign an FSM first.");
  const fsmId = building.assignedFsmId;
  const fsm = users.find((user) => [user.id, user.uid, user.authUid, user.fsmId, user.email, user.fullName].filter(Boolean).includes(fsmId));
  if (!fsm) throw new Error(`Assigned FSM ${fsmId} was not found in users.`);

  const writes = buildWrites(building, fsmId);
  for (let offset = 0; offset < writes.length; offset += 400) {
    await request(`${apiRoot}:commit`, token, { method: "POST", body: JSON.stringify({ writes: writes.slice(offset, offset + 400) }) });
  }
  const counts = writes.reduce((result, item) => {
    const collection = item.update.name.split("/").at(-2);
    result[collection] = (result[collection] || 0) + 1;
    return result;
  }, {});
  console.log(JSON.stringify({ seedSource, building: building.buildingName || building.id, fsm: fsm.fullName || fsm.email, counts }, null, 2));
};

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
