// docx v9 cannot be bundled by CRA's webpack:
//   - index.mjs → Babel fails (super() in class with transformed params)
//   - index.cjs / index.umd.cjs → webpack treats .cjs as a binary asset, not JS
// Solution: load the IIFE build (public/docx.iife.js) as a lazy <script> tag
// which sets window.docx with all exports.

/* eslint-disable global-require */
const { saveAs } = require("file-saver");
const {
  buildIssuePeriodSnapshot,
  getDateRangeBounds,
  getMonthBounds
} = require("../utils/issueReporting");
const { downloadUploadedFileBytes } = require("./storageService");

let _docxPromise = null;

const loadDocx = () => {
  if (_docxPromise) return _docxPromise;
  _docxPromise = new Promise((resolve, reject) => {
    if (window.docx) { resolve(window.docx); return; }
    const script = document.createElement("script");
    script.src = `${process.env.PUBLIC_URL}/docx.iife.js`;
    script.onload = () => {
      if (window.docx) resolve(window.docx);
      else reject(new Error("docx IIFE did not expose window.docx"));
    };
    script.onerror = () => reject(new Error("Failed to load docx.iife.js from public folder"));
    document.head.appendChild(script);
  });
  return _docxPromise;
};

// ─── Date helpers ────────────────────────────────────────────────────────────

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtDate = (value, opts = { day: "2-digit", month: "short", year: "numeric" }) => {
  const d = parseDate(value);
  return d ? d.toLocaleDateString("en-SG", opts) : "-";
};

const fmtDateShort = (value) => fmtDate(value, { day: "2-digit", month: "2-digit", year: "numeric" });

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export const getFireDrillReportDate = (drill = {}) =>
  drill.actualDate ||
  drill.conductedDate ||
  drill.completedAt ||
  drill.drillDate ||
  "";

export const isConductedFireDrill = (drill = {}) => {
  if (drill.actualDate || drill.conductedDate || drill.completedAt) return true;
  const status = String(drill.status || drill.performanceStatus || "").trim().toLowerCase();
  return ["completed", "conducted", "submitted", "approved"].includes(status);
};

export const getFireDrillPhotoUrls = (drill = {}) => {
  const candidates = [
    ...(Array.isArray(drill.photoUrls) ? drill.photoUrls : []),
    ...(Array.isArray(drill.photos) ? drill.photos : []),
    drill.photoUrl,
    drill.photo
  ];

  return Array.from(new Set(
    candidates
      .map((photo) => {
        if (typeof photo === "string") return photo.trim();
        return String(
          photo?.url ||
          photo?.downloadURL ||
          photo?.downloadUrl ||
          photo?.photoUrl ||
          ""
        ).trim();
      })
      .filter(Boolean)
  ));
};

const filterDrillsByMonth = (drills, month, year) => {
  const pad = String(month).padStart(2, "0");
  const prefix = `${year}-${pad}`;
  return drills.filter((d) => {
    if (!isConductedFireDrill(d)) return false;
    const dateStr = getFireDrillReportDate(d);
    if (typeof dateStr === "string" && dateStr.startsWith(prefix)) return true;
    const date = parseDate(dateStr);
    return date && date.getMonth() + 1 === month && date.getFullYear() === year;
  });
};

const filterDrillsByYear = (drills, year) =>
  drills.filter((d) => {
    if (!isConductedFireDrill(d)) return false;
    const dateStr = getFireDrillReportDate(d);
    if (typeof dateStr === "string" && dateStr.startsWith(String(year))) return true;
    const date = parseDate(dateStr);
    return date && date.getFullYear() === year;
  });

const filterByMonth = (items, dateField, month, year) =>
  items.filter((item) => {
    const date = parseDate(item[dateField]);
    return date && date.getMonth() + 1 === month && date.getFullYear() === year;
  });

const filterByYear = (items, dateField, year) =>
  items.filter((item) => {
    const date = parseDate(item[dateField]);
    return date && date.getFullYear() === year;
  });

const filterDrillsByDateRange = (drills, from, to) => {
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(`${to}T23:59:59`) : null;
  return drills.filter((d) => {
    if (!isConductedFireDrill(d)) return false;
    const raw = getFireDrillReportDate(d);
    const date = typeof raw === "string" && raw ? new Date(raw) : parseDate(raw);
    if (!date || Number.isNaN(date.getTime())) return false;
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  });
};

const filterByDateRange = (items, dateField, from, to) => {
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(`${to}T23:59:59`) : null;
  return items.filter((item) => {
    const date = parseDate(item[dateField]);
    if (!date) return false;
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  });
};

const isIssueResolved = (i) =>
  ["resolved", "closed"].includes(String(i.status || "").toLowerCase());

const normalizeId = (value) => String(value || "").trim();

const getBuildingIds = (buildings = []) =>
  new Set(
    buildings
      .flatMap((building) => [building.id, building.buildingId])
      .map(normalizeId)
      .filter(Boolean)
  );

const filterByBuildings = (items = [], buildingIds) => {
  if (!buildingIds || buildingIds.size === 0) return items;
  return items.filter((item) => buildingIds.has(normalizeId(item.buildingId)));
};

export const getMonthlyFireDrillsForBuildings = (drills, month, year, buildings) =>
  filterByBuildings(filterDrillsByMonth(drills || [], month, year), getBuildingIds(buildings || []));

export const getAnnualFireDrillsForBuildings = (drills, year, buildings) =>
  filterByBuildings(filterDrillsByYear(drills || [], year), getBuildingIds(buildings || []));

const getBuildingName = (buildingMap, buildingId) => {
  const building = buildingMap.get(buildingId);
  if (!building) return buildingId || "-";
  return building.buildingName || building.building_name || building.buildingId || building.id || "-";
};

const getInspectionKeys = (inspection) =>
  new Set(
    [inspection?.id, inspection?.inspectionId, inspection?.inspectionKey]
      .map(normalizeId)
      .filter(Boolean)
  );

const getInspectionResultKeys = (result) =>
  [result?.inspectionId, result?.inspectionKey]
    .map(normalizeId)
    .filter(Boolean);

const getInlineInspectionResults = (inspection) => {
  const resultSources = [
    inspection?.inspectionResults,
    inspection?.results,
    inspection?.checklistResults
  ];
  return resultSources.find(Array.isArray) || [];
};

const getResultDedupeKey = (result) =>
  normalizeId(result.id || result.resultId || result.resultKey) ||
  [
    result.inspectionId,
    result.inspectionKey,
    result.categoryCode,
    result.itemCode,
    result.itemLabel
  ].map(normalizeId).join("|");

const compareChecklistCodes = (a, b) =>
  normalizeId(a).localeCompare(normalizeId(b), undefined, {
    numeric: true,
    sensitivity: "base"
  });

const sortChecklistResults = (results) =>
  [...results].sort((a, b) => {
    const categoryCompare = compareChecklistCodes(a.categoryCode, b.categoryCode);
    if (categoryCompare !== 0) return categoryCompare;
    return compareChecklistCodes(a.itemCode || a.itemLabel, b.itemCode || b.itemLabel);
  });

const getResultsForInspection = (inspection, inspectionResults = []) => {
  const inspectionKeys = getInspectionKeys(inspection);
  const matchedResults = inspectionResults.filter((result) =>
    getInspectionResultKeys(result).some((key) => inspectionKeys.has(key))
  );

  const deduped = new Map();
  [...getInlineInspectionResults(inspection), ...matchedResults].forEach((result) => {
    deduped.set(getResultDedupeKey(result), result);
  });

  return sortChecklistResults([...deduped.values()]);
};

const getResultsForInspections = (inspections = [], inspectionResults = []) =>
  inspections.flatMap((inspection) => getResultsForInspection(inspection, inspectionResults));

const getPassFailFromCondition = (condition) => {
  if (condition === "Good") return "Pass";
  if (condition === "Faulty") return "Fail";
  if (condition === "N.A.") return "N.A.";
  return "";
};

const getResultAnswer = (result) => result.condition || result.passFail || "-";

const getResultOutcome = (result) =>
  result.passFail || getPassFailFromCondition(result.condition) || "-";

const getChecklistSummary = (results = []) =>
  results.reduce(
    (summary, result) => {
      const condition = String(result.condition || "").toLowerCase();
      const passFail = String(result.passFail || "").toLowerCase();
      const hasAnswer = condition || passFail;

      if (hasAnswer) summary.answered += 1;
      if (condition === "good" || passFail === "pass") summary.passed += 1;
      if (condition === "faulty" || passFail === "fail") summary.failed += 1;
      if (
        condition === "n.a." ||
        condition === "n/a" ||
        condition === "na" ||
        passFail === "n.a." ||
        passFail === "n/a" ||
        passFail === "na"
      ) {
        summary.notApplicable += 1;
      }

      return summary;
    },
    { answered: 0, passed: 0, failed: 0, notApplicable: 0 }
  );

const groupResultsByCategory = (results = []) => {
  const groups = new Map();

  results.forEach((result) => {
    const categoryCode = normalizeId(result.categoryCode) || "Uncategorised";
    const categoryName = result.categoryName || "Uncategorised";
    const key = `${categoryCode}|${categoryName}`;

    if (!groups.has(key)) {
      groups.set(key, {
        categoryCode,
        categoryName,
        items: []
      });
    }

    groups.get(key).items.push(result);
  });

  return [...groups.values()].sort((a, b) => compareChecklistCodes(a.categoryCode, b.categoryCode));
};

const formatResultNotes = (result) => {
  const notes = [
    result.remark && `Remark: ${result.remark}`,
    result.issueDescription && `Issue: ${result.issueDescription}`,
    result.rectification && `Rectification: ${result.rectification}`
  ].filter(Boolean);

  return notes.join("; ") || "-";
};

const hasNonBlankRemark = (result) =>
  String(result?.remark || "").trim().length > 0;

const getResultPhotoUrl = (result) =>
  [
    ...(Array.isArray(result?.defectPhotoUrls) ? result.defectPhotoUrls : []),
    result?.defectPhotoUrl,
    result?.photoUrl,
    result?.issuePhotoUrl,
    result?.beforePhotoUrl,
    result?.photo
  ]
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";

const isDefectResult = (result) => {
  const condition = String(result?.condition || "").trim().toLowerCase();
  const passFail = String(result?.passFail || "").trim().toLowerCase();
  return condition === "faulty" || passFail === "fail";
};

const hasAppendixEvidence = (result) =>
  hasNonBlankRemark(result) ||
  !!getResultPhotoUrl(result) ||
  String(result?.issueDescription || "").trim().length > 0 ||
  String(result?.rectification || "").trim().length > 0 ||
  isDefectResult(result);

const buildAppendixAEntries = (results = []) =>
  results
    .filter((result) => {
      const selectedCondition = String(result.condition || result.passFail || "").trim();
      return selectedCondition && hasAppendixEvidence(result);
    })
    .map((result) => {
      const remarkText = String(result.remark || "").trim();
      const categoryLabel =
        result.categoryCode && result.categoryName && result.categoryName !== result.categoryCode
          ? `${result.categoryCode} - ${result.categoryName}`
          : result.categoryName || result.categoryCode || "-";
      const itemLabel =
        result.itemCode && result.itemLabel
          ? `${result.itemCode} - ${result.itemLabel}`
          : result.itemLabel || result.itemCode || "-";
      const linkedDetails = [
        result.issueDescription && `Finding: ${result.issueDescription}`,
        result.rectification && `Rectification: ${result.rectification}`
      ].filter(Boolean);
      const photoUrl = getResultPhotoUrl(result);

      return {
        location: result.location || result.floorName || result.inspectionPath || "-",
        photoUrl,
        photographs: photoUrl ? "Attached" : "-",
        findings: `Section: ${categoryLabel}\nItem: ${itemLabel}\nCondition: ${getResultAnswer(result)}`,
        remarks: [
          remarkText && `Remark: ${remarkText}`,
          ...linkedDetails
        ].filter(Boolean).join("\n") || "-"
      };
    });

const buildChecklistResultChildren = ({
  inspections = [],
  inspectionResults = [],
  buildingMap,
  h2,
  para,
  txt,
  makeTable,
  spacer
}) => {
  if (inspections.length === 0) {
    return [para("No inspection checklist results were recorded during this period.")];
  }

  return inspections.flatMap((inspection, inspectionIndex) => {
    const results = getResultsForInspection(inspection, inspectionResults);
    const buildingName = getBuildingName(buildingMap, inspection.buildingId);
    const floorName = inspection.floorName || inspection.floorId || "-";
    const inspectionTitle = `Inspection ${inspectionIndex + 1}: ${buildingName}`;
    const children = [
      h2(inspectionTitle),
      para([
        txt("Location: ", { bold: true }),
        txt(`${floorName}  |  `),
        txt("Date: ", { bold: true }),
        txt(`${fmtDate(inspection.inspectionDate)}  |  `),
        txt("Status: ", { bold: true }),
        txt(inspection.status || "-")
      ])
    ];

    if (results.length === 0) {
      return [
        ...children,
        para("No checklist answer rows were found for this inspection."),
        spacer()
      ];
    }

    groupResultsByCategory(results).forEach((group) => {
      const categoryLabel =
        group.categoryCode && group.categoryName && group.categoryName !== group.categoryCode
          ? `${group.categoryCode} - ${group.categoryName}`
          : group.categoryName || group.categoryCode;

      children.push(
        para([txt(categoryLabel, { bold: true })]),
        makeTable(
          ["Code", "Checklist Item", "Answer", "Result", "Remarks / Rectification"],
          group.items.map((result) => [
            result.itemCode || "-",
            result.itemLabel || "-",
            getResultAnswer(result),
            getResultOutcome(result),
            formatResultNotes(result)
          ]),
          [700, 2700, 1000, 900, 4060]
        ),
        spacer()
      );
    });

    return children;
  });
};

const escapeHtml = (value) =>
  String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderHtmlTable = (headers, rows) => `
  <table>
    <thead>
      <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows.map((row) => `
        <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>
      `).join("")}
    </tbody>
  </table>
`;

const renderMultilineHtml = (value) =>
  escapeHtml(value).replace(/\n/g, "<br />");

const renderReportPhotoHtml = (url, alt) =>
  url
    ? `<img class="report-photo" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" />`
    : `<span class="photo-fallback">-</span>`;

export const getFireDrillPhotoCaption = (drill = {}, photoIndex = 0) => {
  const photo = Array.isArray(drill.photos) ? drill.photos[photoIndex] : null;
  const storedCaption = Array.isArray(drill.photoCaptions)
    ? drill.photoCaptions[photoIndex]
    : "";

  return String(
    storedCaption ||
    photo?.caption ||
    photo?.description ||
    drill.photoCaption ||
    drill.photoDescription ||
    `Fire drill photographic evidence ${photoIndex + 1}`
  ).trim();
};

const getReportImageType = (contentType, url) => {
  const normalizedType = String(contentType || "").toLowerCase();
  const normalizedUrl = String(url || "").toLowerCase().split("?")[0];
  if (normalizedType.includes("png") || normalizedUrl.endsWith(".png")) return "png";
  if (normalizedType.includes("gif") || normalizedUrl.endsWith(".gif")) return "gif";
  if (normalizedType.includes("bmp") || normalizedUrl.endsWith(".bmp")) return "bmp";
  return "jpg";
};

const REPORT_IMAGE_TIMEOUT_MS = 4000;
const REPORT_IMAGE_COMPRESSION_THRESHOLD = 750 * 1024;
const REPORT_IMAGE_MAX_WIDTH = 1200;
const REPORT_IMAGE_MAX_HEIGHT = 900;

const withTimeout = (promise, timeoutMs, message) =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(
      () => reject(new Error(message)),
      timeoutMs
    );
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });

const fetchExternalReportImage = async (url) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REPORT_IMAGE_TIMEOUT_MS
  );
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Unable to download report photograph (${response.status}).`);
    }
    return {
      data: await response.arrayBuffer(),
      contentType: response.headers.get("content-type") || ""
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const compressReportImage = async (data, imageType) => {
  const byteLength = data?.byteLength ?? data?.length ?? 0;
  if (
    byteLength < REPORT_IMAGE_COMPRESSION_THRESHOLD ||
    typeof window.createImageBitmap !== "function"
  ) {
    return { data, imageType };
  }

  const mimeType = imageType === "png" ? "image/png" : "image/jpeg";
  let bitmap;
  try {
    bitmap = await window.createImageBitmap(new Blob([data], { type: mimeType }));
    const scale = Math.min(
      1,
      REPORT_IMAGE_MAX_WIDTH / bitmap.width,
      REPORT_IMAGE_MAX_HEIGHT / bitmap.height
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return { data, imageType };
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const compressedBlob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.72)
    );
    if (!compressedBlob || compressedBlob.size >= byteLength) {
      return { data, imageType };
    }
    return {
      data: await compressedBlob.arrayBuffer(),
      imageType: "jpg"
    };
  } catch {
    return { data, imageType };
  } finally {
    bitmap?.close?.();
  }
};

const loadWordReportImage = async (docxNS, url) => {
  let data;
  let contentType = "";
  const isFirebaseStorageUrl =
    /(?:firebasestorage\.googleapis\.com|storage\.googleapis\.com)/i.test(url);

  if (isFirebaseStorageUrl) {
    data = await withTimeout(
      downloadUploadedFileBytes(url),
      REPORT_IMAGE_TIMEOUT_MS,
      "Timed out while downloading a Firebase report photograph."
    );
  } else {
    const externalImage = await fetchExternalReportImage(url);
    data = externalImage.data;
    contentType = externalImage.contentType;
  }

  const optimizedImage = await compressReportImage(
    data,
    getReportImageType(contentType, url)
  );
  return new docxNS.ImageRun({
    data: optimizedImage.data,
    type: optimizedImage.imageType,
    transformation: { width: 430, height: 260 }
  });
};

const buildAnnualFireDrillPhotoChildren = async ({
  docxNS,
  drills,
  buildingMap,
  h1,
  h2,
  para,
  txt,
  spacer
}) => {
  const drillsWithPhotos = drills
    .map((drill) => ({ drill, photoUrls: getFireDrillPhotoUrls(drill) }))
    .filter(({ photoUrls }) => photoUrls.length > 0);

  const children = [
    h1("4.3.1 PHOTOGRAPHIC EVIDENCE OF FIRE DRILL"),
    spacer()
  ];

  if (drillsWithPhotos.length === 0) {
    children.push(
      para("No fire drill photographs were uploaded for this reporting year."),
      spacer(),
      spacer()
    );
    return children;
  }

  const preparedDrills = await Promise.all(
    drillsWithPhotos.map(async ({ drill, photoUrls }) => ({
      drill,
      photos: await Promise.all(
        photoUrls.map(async (photoUrl, photoIndex) => {
          const caption = getFireDrillPhotoCaption(drill, photoIndex);
          try {
            return {
              caption,
              imageRun: await loadWordReportImage(docxNS, photoUrl),
              photoUrl
            };
          } catch (error) {
            return { caption, error, imageRun: null, photoUrl };
          }
        })
      )
    }))
  );

  for (let drillIndex = 0; drillIndex < preparedDrills.length; drillIndex += 1) {
    const { drill, photos } = preparedDrills[drillIndex];
    const buildingName =
      getBuildingName(buildingMap, drill.buildingId) ||
      drill.buildingName ||
      "-";
    children.push(
      h2(
        `Drill ${drillIndex + 1}: ${buildingName} — ${fmtDateShort(
          getFireDrillReportDate(drill)
        )}`
      )
    );

    for (let photoIndex = 0; photoIndex < photos.length; photoIndex += 1) {
      const { caption, imageRun, photoUrl } = photos[photoIndex];
      if (imageRun) {
        children.push(
          para([imageRun], { alignment: "center" }),
          para(
            [
              txt(`Photograph ${photoIndex + 1}: `, { bold: true }),
              txt(caption)
            ],
            { alignment: "center" }
          )
        );
      } else {
        children.push(
          para([
            txt(`Photograph ${photoIndex + 1}: `, { bold: true }),
            txt(caption)
          ]),
          para([
            txt("Image link: ", { bold: true }),
            txt(photoUrl)
          ])
        );
      }
      children.push(spacer());
    }
  }

  children.push(spacer());
  return children;
};

const renderAppendixAHtml = (entries = []) => {
  if (entries.length === 0) {
    return "<p>No findings to report for this period.</p>";
  }

  return `
    <table>
      <thead>
        <tr>
          <th>S/No</th>
          <th>Location</th>
          <th>Photographs</th>
          <th>Findings</th>
          <th>Remarks / Proposed Rectification</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map((entry, idx) => `
          <tr>
            <td>${String(idx + 1).padStart(2, "0")}</td>
            <td>${renderMultilineHtml(entry.location)}</td>
            <td class="photo-cell">${renderReportPhotoHtml(entry.photoUrl, `Finding ${idx + 1} photograph`)}</td>
            <td>${renderMultilineHtml(entry.findings)}</td>
            <td>${renderMultilineHtml(entry.remarks)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
};

const renderChecklistResultHtml = ({ inspections = [], inspectionResults = [], buildingMap }) => {
  if (inspections.length === 0) {
    return "<p>No inspection checklist results were recorded during this period.</p>";
  }

  return inspections.map((inspection, inspectionIndex) => {
    const results = getResultsForInspection(inspection, inspectionResults);
    const buildingName = getBuildingName(buildingMap, inspection.buildingId);
    const floorName = inspection.floorName || inspection.floorId || "-";
    const summary = `
      <h3>Inspection ${inspectionIndex + 1}: ${escapeHtml(buildingName)}</h3>
      <p class="muted">
        <strong>Location:</strong> ${escapeHtml(floorName)}
        <span>|</span>
        <strong>Date:</strong> ${escapeHtml(fmtDate(inspection.inspectionDate))}
        <span>|</span>
        <strong>Status:</strong> ${escapeHtml(inspection.status || "-")}
      </p>
    `;

    if (results.length === 0) {
      return `${summary}<p>No checklist answer rows were found for this inspection.</p>`;
    }

    const categoryTables = groupResultsByCategory(results).map((group) => {
      const categoryLabel =
        group.categoryCode && group.categoryName && group.categoryName !== group.categoryCode
          ? `${group.categoryCode} - ${group.categoryName}`
          : group.categoryName || group.categoryCode;

      return `
        <h4>${escapeHtml(categoryLabel)}</h4>
        ${renderHtmlTable(
          ["Code", "Checklist Item", "Answer", "Result", "Remarks / Rectification"],
          group.items.map((result) => [
            result.itemCode || "-",
            result.itemLabel || "-",
            getResultAnswer(result),
            getResultOutcome(result),
            formatResultNotes(result)
          ])
        )}
      `;
    }).join("");

    return `${summary}${categoryTables}`;
  }).join("");
};

const printHtmlReport = (html, title) => {
  const iframe = document.createElement("iframe");
  iframe.title = title;
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const printDocument = printWindow.document;
  printDocument.open();
  printDocument.write(html);
  printDocument.close();

  const waitForFrameLoad = () =>
    new Promise((resolve) => {
      if (printDocument.readyState === "complete") {
        resolve();
        return;
      }

      const timeout = window.setTimeout(resolve, 1500);
      printWindow.addEventListener("load", () => {
        window.clearTimeout(timeout);
        resolve();
      }, { once: true });
    });

  const waitForImages = () => {
    const images = Array.from(printDocument.images || []);
    if (images.length === 0) return Promise.resolve();

    const imagePromises = images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    });

    return Promise.race([
      Promise.all(imagePromises),
      new Promise((resolve) => window.setTimeout(resolve, 7000))
    ]);
  };

  const printWhenReady = async () => {
    await waitForFrameLoad();
    if (printDocument.fonts?.ready) {
      await printDocument.fonts.ready.catch(() => {});
    }
    await waitForImages();
    printWindow.focus();
    printWindow.print();
    window.setTimeout(() => iframe.remove(), 1000);
  };

  void printWhenReady();
};

// ─── docx builder helpers (receive live docx namespace) ──────────────────────

const buildHelpers = (docxNS) => {
  const { Paragraph, Table, TableCell, TableRow, TextRun } = docxNS;

  const txt = (text, opts = {}) => new TextRun({ text: String(text ?? ""), ...opts });

  const para = (children, opts = {}) =>
    new Paragraph({ children: Array.isArray(children) ? children : [txt(children)], ...opts });

  const boldPara = (text, opts = {}) =>
    new Paragraph({ children: [txt(text, { bold: true })], ...opts });

  const centered = (children, bold = false) =>
    new Paragraph({
      alignment: "center",
      children: Array.isArray(children)
        ? children
        : [txt(children, { bold, size: bold ? 28 : 22 })]
    });

  const spacer = () => new Paragraph({ text: "" });

  const h1 = (text) =>
    new Paragraph({
      children: [txt(text, { bold: true, size: 24, underline: {} })],
      spacing: { before: 200, after: 100 }
    });

  const h2 = (text) =>
    new Paragraph({
      children: [txt(text, { bold: true, size: 22 })],
      spacing: { before: 160, after: 80 }
    });

  // Table width helper
  const fullWidth = { size: 9360, type: "dxa" }; // ~6.5 inches
  const halfWidth = { size: 4680, type: "dxa" };

  const cell = (content, opts = {}) => {
    const children = Array.isArray(content)
      ? content
      : [new Paragraph({ children: [txt(String(content ?? "-"), opts.textOpts || {})] })];
    return new TableCell({
      children,
      shading: opts.shading || undefined,
      width: opts.width || undefined,
      columnSpan: opts.columnSpan || undefined
    });
  };

  const headerCell = (text, width) =>
    cell(text, {
      shading: { fill: "1A5276", color: "FFFFFF" },
      textOpts: { bold: true, color: "FFFFFF", size: 18 },
      width: width ? { size: width, type: "dxa" } : undefined
    });

  const subHeaderCell = (text) =>
    cell(text, {
      shading: { fill: "D6EAF8" },
      textOpts: { bold: true, size: 18 }
    });

  const makeTable = (headers, rows, widths) =>
    new Table({
      width: fullWidth,
      rows: [
        new TableRow({
          tableHeader: true,
          children: headers.map((h, i) => headerCell(h, widths ? widths[i] : undefined))
        }),
        ...rows.map((cells) =>
          new TableRow({
            children: cells.map((c, i) =>
              cell(c, { width: widths ? { size: widths[i], type: "dxa" } : undefined })
            )
          })
        )
      ]
    });

  const infoTable = (rows) =>
    new Table({
      width: fullWidth,
      rows: rows.map(([label, value]) =>
        new TableRow({
          children: [
            cell(label, {
              shading: { fill: "EBF5FB" },
              textOpts: { bold: true, size: 18 },
              width: { size: 2800, type: "dxa" }
            }),
            cell(String(value ?? "-"), { width: { size: 6560, type: "dxa" } })
          ]
        })
      )
    });

  return { txt, para, boldPara, centered, spacer, h1, h2, cell, headerCell, subHeaderCell, makeTable, infoTable, fullWidth, halfWidth };
};

// ─── Monthly Report ───────────────────────────────────────────────────────────

export const generateMonthlyReport = async ({
  month,
  year,
  buildings,
  inspections,
  inspectionResults = [],
  issues,
  generatedBy
}) => {
  const docxNS = await loadDocx();
  const { Document, Packer, Paragraph } = docxNS;
  const { txt, para, centered, spacer, h1, h2, makeTable, infoTable } = buildHelpers(docxNS);

  const monthLabel = MONTHS[month - 1];
  const buildingMap = new Map(
    buildings.map((b) => [b.id, b])
  );

  const selectedBuildingIds = getBuildingIds(buildings);
  const monthInspections = filterByBuildings(
    filterByMonth(inspections, "inspectionDate", month, year),
    selectedBuildingIds
  );
  const selectedIssues = filterByBuildings(issues, selectedBuildingIds);
  const monthBounds = getMonthBounds(month, year);
  const issueSnapshot = buildIssuePeriodSnapshot(selectedIssues, monthBounds.start, monthBounds.end);
  const monthIssues = issueSnapshot.relevant.map((record) => ({
    ...record.issue,
    reportStatus: record.statusAtEnd,
    reportActivity: record.activity
  }));
  const monthInspectionResults = getResultsForInspections(monthInspections, inspectionResults);
  const checklistSummary = getChecklistSummary(monthInspectionResults);
  const appendixAEntries = buildAppendixAEntries(monthInspectionResults);

  const openIssues = issueSnapshot.outstanding;

  // Use first selected building if specific, else show "All Buildings"
  const primaryBuilding = buildings.length === 1 ? buildings[0] : null;
  const buildingName = primaryBuilding
    ? (primaryBuilding.buildingName || primaryBuilding.building_name || primaryBuilding.id)
    : buildings.map((b) => b.buildingName || b.building_name || b.id).join(", ") || "All Buildings";
  const buildingAddress = primaryBuilding?.address || "-";

  const today = new Date();
  const children = [
    // ── Cover Header ──
    centered([txt("CBRE PTE LTD", { bold: true, size: 32 })]),
    centered([txt("FIRE SAFETY MANAGER", { bold: true, size: 26 })]),
    centered([txt("MONTHLY INSPECTION REPORT", { bold: true, size: 26 })]),
    spacer(),

    // ── Memo-style header ──
    infoTable([
      ["To", "Building Owner / Management"],
      ["From", generatedBy],
      ["Name & Address of Estate", `${buildingName}\n${buildingAddress}`],
      ["Date of Report", fmtDate(today)],
      ["For the month of", `${monthLabel} ${year}`],
      ["Buildings Covered", buildingName]
    ]),
    spacer(),
    spacer(),

    // ── Section 1: Summary ──
    h1("SECTION 1: MONTHLY SUMMARY"),
    spacer(),
    makeTable(
      ["Metric", "Value"],
      [
        ["Inspections Conducted", String(monthInspections.length)],
        ["Checklist Items Answered", String(checklistSummary.answered)],
        ["Checklist Items Passed", String(checklistSummary.passed)],
        ["Checklist Defects Found", String(checklistSummary.failed)],
        ["Checklist Items N.A.", String(checklistSummary.notApplicable)],
        ["Issues Created in Month", String(issueSnapshot.created.length)],
        ["Outstanding at Month End", String(openIssues.length)],
        ["Resolved / Closed in Month", String(issueSnapshot.resolved.length)]
      ],
      [3000, 6360]
    ),
    spacer(),
    spacer(),

    // ── Section 2: Fire Protection Systems Inspections ──
    h1("SECTION 2: FIRE PROTECTION SYSTEMS — INSPECTION SUMMARY"),
    spacer(),
    ...(monthInspections.length === 0
      ? [para("No inspections were conducted during this period.")]
      : [
          makeTable(
            ["S/No", "Building", "Inspection Type", "Date", "Status", "Remarks"],
            monthInspections.map((insp, idx) => {
              const bldg = buildingMap.get(insp.buildingId);
              const bldgName = bldg
                ? (bldg.buildingName || bldg.building_name || insp.buildingId)
                : (insp.buildingId || "-");
              return [
                String(idx + 1),
                bldgName,
                insp.inspectionType || "-",
                fmtDate(insp.inspectionDate),
                insp.status || "-",
                insp.generalRemarks || "-"
              ];
            }),
            [400, 1800, 2000, 1400, 1200, 2560]
          )
        ]),
    spacer(),
    spacer(),

    // ── Section 3: Inspection Checklist Results ──
    h1("SECTION 3: INSPECTION CHECKLIST RESULTS"),
    spacer(),
    ...buildChecklistResultChildren({
      inspections: monthInspections,
      inspectionResults,
      buildingMap,
      h2,
      para,
      txt,
      makeTable,
      spacer
    }),
    spacer(),
    spacer(),

    // ── Section 4: Issues / Findings ──
    h1("SECTION 4: ISSUES / DEFECTS IDENTIFIED"),
    spacer(),
    ...(monthIssues.length === 0
      ? [para("No issues were recorded during this period.")]
      : [
          makeTable(
            ["S/No", "Building", "Location", "Finding", "Priority", "Month-End Status", "Monthly Activity", "Rectification"],
            monthIssues.map((iss, idx) => {
              const bldg = buildingMap.get(iss.buildingId);
              const bldgName = bldg
                ? (bldg.buildingName || bldg.building_name || iss.buildingId)
                : (iss.buildingId || "-");
              return [
                String(idx + 1),
                bldgName,
                iss.location || iss.floorName || "-",
                iss.issueTitle || iss.issueDescription || "-",
                iss.priority || "Medium",
                iss.reportStatus || iss.status || "Open",
                iss.reportActivity || "-",
                iss.rectification || "Pending rectification"
              ];
            }),
            [350, 1150, 1000, 1450, 750, 950, 1600, 2110]
          )
        ]),
    spacer(),
    spacer(),

    // ── Section 5: General Observations ──
    h1("SECTION 5: GENERAL OBSERVATIONS / REMARKS"),
    spacer(),
    para("All fire safety systems were inspected and found to be in general working order. Any defects identified have been recorded in Section 4 above and communicated to the building owner / management for rectification."),
    spacer(),
    ...(monthIssues.length > 0
      ? [para(`${openIssues.length} issue(s) were outstanding at the end of ${monthLabel} ${year}. ${issueSnapshot.resolved.length} issue(s) were resolved or closed during the month.`)]
      : [para(`No issues were outstanding at the end of ${monthLabel} ${year}.`)]),
    spacer(),
    spacer(),

    // ── Signature ──
    h1("CERTIFICATION"),
    spacer(),
    para("I hereby certify that the above information is accurate and the fire safety inspection has been carried out in accordance with the requirements of the Fire Safety Act (Cap. 109A) and its subsidiary legislation."),
    spacer(),
    spacer(),
    para([txt("Name of Fire Safety Manager:  ", { bold: true }), txt(generatedBy)]),
    spacer(),
    para([txt("Signature:  ", { bold: true }), txt("_______________________________")]),
    spacer(),
    para([txt("Date:  ", { bold: true }), txt(fmtDate(today))]),
    spacer(),
    spacer(),

    // ── Appendix A ──
    new Paragraph({
      children: [txt("APPENDIX A — DETAILED FINDINGS", { bold: true, size: 24, underline: {} })],
      pageBreakBefore: true,
      spacing: { before: 0, after: 200 }
    }),
    para([txt(`Property:  `, { bold: true }), txt(buildingName)]),
    para([txt("Period:  ", { bold: true }), txt(`${monthLabel} ${year}`)]),
    para([txt("Prepared By:  ", { bold: true }), txt(`${generatedBy}, CBRE Pte Ltd`)]),
    spacer(),

    ...(appendixAEntries.length === 0
      ? [para("No findings to report for this period.")]
      : [
          makeTable(
            ["S/No", "Location", "Photographs", "Findings", "Remarks / Proposed Rectification"],
            appendixAEntries.map((entry, idx) => [
              String(idx + 1).padStart(2, "0"),
              entry.location,
              entry.photographs,
              entry.findings,
              entry.remarks
            ]),
            [400, 1600, 1800, 2400, 3160]
          )
        ]),

    spacer(),
    centered([txt("— End of Monthly Inspection Report —", { italics: true, color: "6B7280" })])
  ];

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `FSM_Monthly_Report_${monthLabel}_${year}.docx`);
};

export const generateMonthlyReportPdf = async ({
  month,
  year,
  buildings = [],
  inspections = [],
  inspectionResults = [],
  issues = [],
  generatedBy = "Admin"
}) => {
  const monthLabel = MONTHS[month - 1];
  const buildingMap = new Map(buildings.map((b) => [b.id, b]));
  const selectedBuildingIds = getBuildingIds(buildings);
  const monthInspections = filterByBuildings(
    filterByMonth(inspections, "inspectionDate", month, year),
    selectedBuildingIds
  );
  const selectedIssues = filterByBuildings(issues, selectedBuildingIds);
  const monthBounds = getMonthBounds(month, year);
  const issueSnapshot = buildIssuePeriodSnapshot(selectedIssues, monthBounds.start, monthBounds.end);
  const monthIssues = issueSnapshot.relevant.map((record) => ({
    ...record.issue,
    reportStatus: record.statusAtEnd,
    reportActivity: record.activity
  }));
  const monthInspectionResults = getResultsForInspections(monthInspections, inspectionResults);
  const checklistSummary = getChecklistSummary(monthInspectionResults);
  const appendixAEntries = buildAppendixAEntries(monthInspectionResults);
  const openIssues = issueSnapshot.outstanding;

  const primaryBuilding = buildings.length === 1 ? buildings[0] : null;
  const buildingName = primaryBuilding
    ? (primaryBuilding.buildingName || primaryBuilding.building_name || primaryBuilding.id)
    : buildings.map((b) => b.buildingName || b.building_name || b.id).join(", ") || "All Buildings";
  const buildingAddress = primaryBuilding?.address || "-";
  const title = `FSM_Monthly_Report_${monthLabel}_${year}`;

  const inspectionRows = monthInspections.map((insp, idx) => [
    String(idx + 1),
    getBuildingName(buildingMap, insp.buildingId),
    insp.inspectionType || "-",
    fmtDate(insp.inspectionDate),
    insp.status || "-",
    insp.generalRemarks || "-"
  ]);

  const issueRows = monthIssues.map((issue, idx) => [
    String(idx + 1),
    getBuildingName(buildingMap, issue.buildingId),
    issue.location || issue.floorName || "-",
    issue.issueTitle || issue.issueDescription || "-",
    issue.priority || "Medium",
    issue.reportStatus || issue.status || "Open",
    issue.reportActivity || "-",
    issue.rectification || "Pending rectification"
  ]);

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            color: #111827;
            margin: 0;
            line-height: 1.45;
          }
          h1, h2, h3, h4 { margin: 0 0 10px; color: #0f172a; }
          h1 { text-align: center; font-size: 20px; letter-spacing: 0; }
          h2 {
            border-bottom: 2px solid #0f766e;
            font-size: 16px;
            margin-top: 24px;
            padding-bottom: 6px;
          }
          h3 { font-size: 14px; margin-top: 18px; }
          h4 { font-size: 13px; margin-top: 14px; }
          p { margin: 6px 0 12px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0 16px;
            page-break-inside: avoid;
          }
          th, td {
            border: 1px solid #d1d5db;
            font-size: 11px;
            padding: 6px 7px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #1f4e79;
            color: #ffffff;
            font-weight: 700;
          }
          .cover { text-align: center; margin-bottom: 18px; }
          .cover .company { font-size: 22px; font-weight: 700; }
          .meta {
            display: grid;
            grid-template-columns: 190px 1fr;
            border: 1px solid #d1d5db;
            margin-bottom: 18px;
          }
          .meta div { padding: 7px 9px; border-bottom: 1px solid #d1d5db; }
          .meta div:nth-child(odd) { background: #ebf5fb; font-weight: 700; }
          .meta div:nth-last-child(-n+2) { border-bottom: 0; }
          .muted { color: #4b5563; font-size: 12px; }
          .end { text-align: center; color: #6b7280; font-style: italic; margin-top: 24px; }
          .appendix { page-break-before: always; }
          .appendix table { page-break-inside: auto; }
          .appendix tr { page-break-inside: avoid; }
          .photo-cell { width: 130px; }
          .report-photo {
            display: block;
            width: 116px;
            max-height: 92px;
            object-fit: contain;
            border: 1px solid #d1d5db;
            background: #ffffff;
          }
          .photo-fallback { color: #6b7280; font-size: 11px; }
        </style>
      </head>
      <body>
        <section class="cover">
          <div class="company">CBRE PTE LTD</div>
          <h1>FIRE SAFETY MANAGER<br />MONTHLY INSPECTION REPORT</h1>
        </section>

        <section class="meta">
          <div>To</div><div>Building Owner / Management</div>
          <div>From</div><div>${escapeHtml(generatedBy)}</div>
          <div>Name & Address of Estate</div><div>${escapeHtml(`${buildingName} ${buildingAddress}`)}</div>
          <div>Date of Report</div><div>${escapeHtml(fmtDate(new Date()))}</div>
          <div>For the month of</div><div>${escapeHtml(`${monthLabel} ${year}`)}</div>
          <div>Buildings Covered</div><div>${escapeHtml(buildingName)}</div>
        </section>

        <h2>Monthly Summary</h2>
        ${renderHtmlTable(
          ["Metric", "Value"],
          [
            ["Inspections Conducted", String(monthInspections.length)],
            ["Checklist Items Answered", String(checklistSummary.answered)],
            ["Checklist Items Passed", String(checklistSummary.passed)],
            ["Checklist Defects Found", String(checklistSummary.failed)],
            ["Checklist Items N.A.", String(checklistSummary.notApplicable)],
            ["Issues Created in Month", String(issueSnapshot.created.length)],
            ["Outstanding at Month End", String(openIssues.length)],
            ["Resolved / Closed in Month", String(issueSnapshot.resolved.length)]
          ]
        )}

        <h2>Inspection Summary</h2>
        ${
          inspectionRows.length
            ? renderHtmlTable(["S/No", "Building", "Inspection Type", "Date", "Status", "Remarks"], inspectionRows)
            : "<p>No inspections were conducted during this period.</p>"
        }

        <h2>Inspection Checklist Results</h2>
        ${renderChecklistResultHtml({ inspections: monthInspections, inspectionResults, buildingMap })}

        <h2>Issues / Defects Identified</h2>
        ${
          issueRows.length
            ? renderHtmlTable(["S/No", "Building", "Location", "Finding", "Priority", "Month-End Status", "Monthly Activity", "Rectification"], issueRows)
            : "<p>No issues were recorded during this period.</p>"
        }

        <h2>General Observations / Remarks</h2>
        <p>
          All fire safety systems were inspected and found to be in general working order.
          Any defects identified have been recorded above and communicated for rectification.
        </p>
        <p>${escapeHtml(
          monthIssues.length > 0
            ? `${openIssues.length} issue(s) were outstanding at the end of ${monthLabel} ${year}; ${issueSnapshot.resolved.length} were resolved or closed during the month.`
            : `No issues were outstanding at the end of ${monthLabel} ${year}.`
        )}</p>

        <h2>Certification</h2>
        <p>I hereby certify that the above information is accurate and the fire safety inspection has been carried out in accordance with the applicable fire safety requirements.</p>
        <p><strong>Name of Fire Safety Manager:</strong> ${escapeHtml(generatedBy)}</p>
        <p><strong>Signature:</strong> _______________________________</p>
        <p><strong>Date:</strong> ${escapeHtml(fmtDate(new Date()))}</p>

        <section class="appendix">
          <h2>Appendix A - Detailed Findings</h2>
          <p><strong>Property:</strong> ${escapeHtml(buildingName)}</p>
          <p><strong>Period:</strong> ${escapeHtml(`${monthLabel} ${year}`)}</p>
          <p><strong>Prepared By:</strong> ${escapeHtml(`${generatedBy}, CBRE Pte Ltd`)}</p>
          ${renderAppendixAHtml(appendixAEntries)}
        </section>

        <p class="end">End of Monthly Inspection Report</p>
      </body>
    </html>
  `;

  printHtmlReport(html, title);
};

// ─── Annual Report ────────────────────────────────────────────────────────────

export const generateAnnualReport = async ({
  year,
  buildings,
  fireDrills,
  inspections,
  issues,
  users = [],
  generatedBy
}) => {
  if (!Array.isArray(buildings) || buildings.length !== 1) {
    throw new Error("Select exactly one building before generating an annual report.");
  }

  const docxNS = await loadDocx();
  const { Document, Packer } = docxNS;
  const { txt, para, centered, spacer, h1, h2, makeTable, infoTable } = buildHelpers(docxNS);

  const buildingMap = new Map(buildings.map((b) => [b.id, b]));
  const selectedBuildingIds = getBuildingIds(buildings);

  const yearDrills = getAnnualFireDrillsForBuildings(fireDrills, year, buildings);
  const yearIssues = filterByBuildings(filterByYear(issues, "createdAt", year), selectedBuildingIds);

  // One report per building group, or combined if multiple
  const primaryBuilding = buildings.length === 1 ? buildings[0] : null;
  const buildingName = primaryBuilding
    ? (primaryBuilding.buildingName || primaryBuilding.building_name || primaryBuilding.id)
    : "All Buildings";
  const buildingAddress = primaryBuilding?.address || "-";
  const noOfStoreys = primaryBuilding?.noOfStoreys || "-";
  const gfa = primaryBuilding?.grossFloorAreaGfa || "-";
  const occupantLoad = primaryBuilding?.occupantLoad || "-";
  const { owner, fsm } = getAnnualReportParties(primaryBuilding, users, generatedBy);

  // Next 12 months schedule
  const nextYear = year + 1;
  const scheduleRows = [
    ["1", `Jan ${nextYear}`, `Dec ${nextYear}`, "Monthly on-site fire safety inspections"],
    ["2", `Apr ${nextYear}`, `Apr ${nextYear}`, "Fire Warden Briefing / Table-Top Exercise"],
    ["3", `May ${nextYear}`, `May ${nextYear}`, "Annual Fire Evacuation Drill"],
    ["4", `Aug ${nextYear}`, `Aug ${nextYear}`, "Fire Safety Equipment Servicing Review"],
    ["5", `Sep ${nextYear}`, `Sep ${nextYear}`, "Basic Fire Fighting Hands-on Training"]
  ];
  const fireDrillPhotoChildren = await buildAnnualFireDrillPhotoChildren({
    docxNS,
    drills: yearDrills,
    buildingMap,
    h1,
    h2,
    para,
    txt,
    spacer
  });

  const children = [
    // ── Title ──
    centered([txt("ANNUAL FIRE SAFETY REPORT", { bold: true, size: 36 })]),
    spacer(),
    centered([txt(`Year: ${year}`, { bold: true, size: 26 })]),
    spacer(),
    centered([
      txt(
        "Note: Fire Safety Managers (FSMs) and Building Owners are advised to periodically update and review the Annual Fire Safety Report. This report should include up-to-date information on fire safety within the premises and rectification measures taken to ensure a fire-safe environment.",
        { size: 18, italics: true }
      )
    ]),
    spacer(),
    spacer(),

    // ── Building Information ──
    h1("1. BUILDING INFORMATION"),
    spacer(),
    infoTable([
      ["Name of Building", buildingName],
      ["Address", buildingAddress],
      ["No. of Storeys", String(noOfStoreys)],
      ["Gross Floor Area (GFA)", formatFloorArea(gfa)],
      ["Occupant Load (OL)", String(occupantLoad)]
    ]),
    spacer(),
    spacer(),

    // Building Owner(s)
    h1("2. BUILDING OWNER(S)"),
    spacer(),
    makeTable(
      ["Name", "Email Address", "Contact Number"],
      [[owner.name, owner.email, owner.contactNumber]],
      [3200, 3600, 2560]
    ),
    spacer(),
    spacer(),

    // ── EP Measures ──
    h1("3. PROVISION OF EMERGENCY PREPAREDNESS (EP) MEASURES"),
    spacer(),
    makeTable(
      ["S/No", "EP Measure", "Details"],
      [
        [
          "1",
          "Updated Emergency Response Plan (ERP)",
          `Updated: ${firstReportValue(primaryBuilding?.erpUpdated, primaryBuilding?.emergencyResponsePlanUpdated, "-")}\nDate of updated ERP: ${fmtDate(firstReportValue(primaryBuilding?.erpUpdatedDate, primaryBuilding?.emergencyResponsePlanUpdatedDate))}`
        ],
        [
          "2",
          "Validity of Fire Certificate (FC)",
          `From: ${fmtDate(firstReportValue(primaryBuilding?.fireCertificateValidFrom, primaryBuilding?.fcValidFrom))}\nTo: ${fmtDate(firstReportValue(primaryBuilding?.fireCertificateValidTo, primaryBuilding?.fcValidTo))}`
        ],
        ["3", "Name of Appointed FSM", `${fsm.name}\nContact No.: ${fsm.contactNumber}\nEmail: ${fsm.email}`],
        ["4", "Details of Trained CERT Members", getCertMembersText(primaryBuilding)]
      ],
      [500, 3000, 5860]
    ),
    spacer(),
    spacer(),

    h1("4. DETAILS OF ANNUAL FIRE SAFETY REPORT"),
    spacer(),

    // ── Training Records ──
    h1("4.1 RECORD OF TRAINING CONDUCTED"),
    spacer(),
    makeTable(
      ["Category", "From", "To", "Brief Description of Training", "No. of Participants"],
      getAnnualTrainingRows(primaryBuilding, year),
      [1800, 1200, 1200, 3360, 1800]
    ),
    spacer(),
    spacer(),

    h1("4.2 RECORDS OF FIRE SAFETY WORKS, IMPROVEMENT OF BUILDING STRUCTURE, LAYOUT, FIRE PROTECTION SYSTEMS AND OTHER FIRE SAFETY MEASURES"),
    spacer(),
    makeTable(
      ["Type of Works / Improvement", "Description of Works / Improvement", "Date of Implementation"],
      getAnnualWorksRows(primaryBuilding, year),
      [2800, 4160, 2400]
    ),
    spacer(),
    spacer(),

    // ── Fire Drills ──
    h1("4.3 FIRE EVACUATION DRILLS CONDUCTED"),
    spacer(),
    ...(yearDrills.length === 0
      ? [para("No fire drills were conducted during this period.")]
      : [
          makeTable(
            ["S/N", "Date", "No. of Occupants", "No. of Participants", "Time Taken for Evacuation", "Issues Faced"],
            yearDrills.map((d, idx) => {
              return [
                String(idx + 1).padStart(2, "0"),
                fmtDateShort(getFireDrillReportDate(d)),
                d.numberOfOccupants || d.occupants || occupantLoad,
                d.actualParticipants || d.participantsAttended || d.participants || "-",
                d.totalEvacuationTime || d.evacuationTime || "-",
                d.issueFound || d.observations || "N/A"
              ];
            }),
            [500, 1200, 1500, 1500, 1900, 2760]
          )
        ]),
    spacer(),
    spacer(),

    // ── Review of Drills ──
    h1("REVIEW OF FIRE EVACUATION DRILLS"),
    spacer(),
    ...(yearDrills.filter(d => d.recommendations || d.followUpIssues).length === 0
      ? [
          makeTable(
            ["S/N", "Issues Faced", "Recommendations"],
            [["1", "N/A", "Drills conducted satisfactorily. No major issues noted."]],
            [400, 4000, 4960]
          )
        ]
      : [
          makeTable(
            ["S/N", "Issues Faced", "Recommendations"],
            yearDrills
              .filter(d => d.recommendations || d.followUpIssues || d.observations)
              .map((d, idx) => [
                String(idx + 1),
                d.observations || d.issueFound || "Issues noted during drill",
                d.recommendations || d.followUpIssues || "Follow-up action required"
              ]),
            [400, 4000, 4960]
          )
        ]),
    spacer(),
    spacer(),

    ...fireDrillPhotoChildren,

    // ── Findings & Rectification ──
    h1("4.4 FINDINGS OF FIRE SAFETY CHECKS & RECTIFICATION WORKS"),
    spacer(),
    ...(yearIssues.length === 0
      ? [
          makeTable(
            ["S/N", "Date of Fire Safety Check", "Issue Identified", "Rectification Taken"],
            [["1", "-", "No issues identified", "N/A"]],
            [400, 1800, 3000, 4160]
          )
        ]
      : [
          makeTable(
            ["S/N", "Date", "Building", "Issue Identified", "Rectification Taken"],
            yearIssues.map((iss, idx) => {
              const bldg = buildingMap.get(iss.buildingId);
              const bldgName = bldg
                ? (bldg.buildingName || bldg.building_name || iss.buildingId)
                : (iss.buildingId || "-");
              return [
                String(idx + 1),
                fmtDateShort(iss.createdAt),
                bldgName,
                iss.issueTitle || iss.issueDescription || "-",
                iss.rectification || (isIssueResolved(iss) ? "Rectification completed" : "Pending rectification")
              ];
            }),
            [400, 1200, 1600, 3000, 3160]
          )
        ]),
    spacer(),
    spacer(),

    // ── Schedule ──
    h1("4.5 SCHEDULE OF FIRE SAFETY ACTIVITIES FOR THE NEXT 12 MONTHS"),
    spacer(),
    makeTable(
      ["S/N", "From", "To", "Brief Description of Activity"],
      scheduleRows,
      [400, 1200, 1200, 6560]
    ),
    spacer(),
    spacer(),

    // ── Matters Arising ──
    h1("4.6 MATTERS ARISING FROM PREVIOUS REPORT"),
    spacer(),
    ...(yearIssues.filter(i => !isIssueResolved(i)).length === 0
      ? [
          makeTable(
            ["S/N", "Issue(s)", "Action(s) Taken"],
            [["1", "No outstanding issues from previous report.", "N/A"]],
            [400, 4000, 4960]
          )
        ]
      : [
          makeTable(
            ["S/N", "Issue(s)", "Action(s) Taken"],
            yearIssues
              .filter(i => !isIssueResolved(i))
              .map((iss, idx) => [
                String(idx + 1),
                iss.issueTitle || iss.issueDescription || "-",
                iss.rectification || "Pending rectification — follow-up in progress"
              ]),
            [400, 4000, 4960]
          )
        ]),
    spacer(),
    spacer(),

    // ── Arson Prevention ──
    h1("4.7 ARSON PREVENTION PLAN (APP)"),
    spacer(),
    h2("ARSON RISK ASSESSMENT"),
    h2("A) Identifying Critical Locations of Fire Safety Systems"),
    para("• Ensure the Genset room, Switch Room, and Lift Motor Room are always neat and tidy."),
    para("• Ensure there is no leakage in the petroleum storage area."),
    spacer(),
    h2("B) Identifying Fire Hazards"),
    para("• Remove discarded items, rubbish, and pallets from common areas."),
    spacer(),
    h2("C) Checks on Adequacy of Existing Security Measures"),
    para("• Security guards are to patrol critical areas daily."),
    para("• Security staff will check and verify any suspicious activity detected."),
    para("• Any suspicious person found in the compound will be alerted immediately."),
    spacer(),
    h2("D) Scenario Planning"),
    para("• Emergency response and evacuation arrangements are to be reviewed after incidents, drills, or significant changes to the premises."),
    spacer(),
    h2("FIRE SAFETY MANAGEMENT PROCEDURES"),
    h2("A) Inspection Procedures of Fire Safety Systems"),
    para("• Inspect fire safety hazards and equipment monthly."),
    para("• Periodically inspect and check fire extinguishers, dry risers, and related equipment."),
    spacer(),
    h2("B) Fire Safety Housekeeping"),
    para("• Conduct daily checks to ensure firefighting equipment, hose reels, dry risers, and fire extinguishers are unobstructed."),
    para("• Security staff are to conduct regular inspections for suspicious items."),
    spacer(),
    h2("C) Education and Training for Occupants"),
    para("• Conduct fire-extinguisher training so occupants and visitors understand the correct steps for using an extinguisher."),
    spacer(),
    h2("RISK REDUCTION MEASURES"),
    para("• Store flammable materials properly to reduce the likelihood and severity of ignition."),
    para("• Conduct regular checks and maintenance of fire protection systems."),
    para("• Train occupants to recognise fire hazards and respond safely."),
    spacer(),
    spacer(),

    h1("4.8 ANY OTHER ACTIONS TAKEN TO IMPROVE FIRE SAFETY"),
    spacer(),
    h2("1. MAINTENANCE"),
    para(getOtherFireSafetyActionsText(primaryBuilding)),
    spacer(),
    spacer(),

    h1("5. DECLARATION BY FSM"),
    spacer(),
    makeTable(
      ["Declaration", "Signature"],
      [[
        `I, ${fsm.name}, hereby declare that I have prepared this Annual Fire Safety Report accurately to the best of my knowledge. I have also submitted this report to the building owner on ${fmtDate(new Date())}.`,
        "\n\n\n"
      ]],
      [6200, 3160]
    ),
    spacer(),
    spacer(),

    h1("6. DECLARATION BY BUILDING OWNER"),
    spacer(),
    makeTable(
      ["Declaration", "Signature"],
      [[
        `I, ${owner.name}, hereby declare that I have reviewed the Annual Fire Safety Report with my Fire Safety Manager on ${fmtDate(new Date())}. I understand that this includes rectifying the fire safety issues identified and ensuring the required Emergency Preparedness measures are in place at my premises.`,
        "\n\n\n"
      ]],
      [6200, 3160]
    ),
    spacer(),
    spacer(),

    centered([txt("— End of Annual Fire Safety Report —", { italics: true, color: "6B7280" })])
  ];

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const buildingFileName = buildingName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  saveAs(blob, `FSM_Annual_Report_${buildingFileName}_${year}.docx`);
};

const firstReportValue = (...values) =>
  values.find((value) =>
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );

const getUserDisplayName = (user, fallback = "-") => {
  if (!user) return fallback;
  const combinedName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.fullName || user.displayName || combinedName || user.userId || user.email || fallback;
};

const findUserByReference = (users = [], reference) => {
  const target = normalizeId(reference);
  if (!target) return null;
  return users.find((user) =>
    [user.uid, user.id, user.profileId, user.authUid, user.userId, user.email]
      .map(normalizeId)
      .filter(Boolean)
      .includes(target)
  ) || null;
};

export const getAnnualReportParties = (building = {}, users = [], generatedBy = "Admin") => {
  const ownerUser = findUserByReference(
    users,
    firstReportValue(building.customerId, building.ownerId, building.buildingOwnerId)
  );
  const fsmUser = findUserByReference(
    users,
    firstReportValue(building.assignedFsmId, building.fsmId)
  );

  return {
    owner: {
      name: getUserDisplayName(
        ownerUser,
        firstReportValue(
          building.ownerName,
          building.buildingOwnerName,
          building.customerName,
          building.customer,
          "Building Owner / Occupier"
        )
      ),
      email: firstReportValue(
        ownerUser?.email,
        building.ownerEmail,
        building.buildingOwnerEmail,
        building.customerEmail,
        "-"
      ),
      contactNumber: firstReportValue(
        ownerUser?.phoneNumber,
        ownerUser?.contactNumber,
        building.ownerContactNumber,
        building.ownerPhoneNumber,
        building.customerContactNumber,
        "-"
      )
    },
    fsm: {
      name: getUserDisplayName(
        fsmUser,
        firstReportValue(building.assignedFsmName, building.assignedFsm, generatedBy, "-")
      ),
      email: firstReportValue(
        fsmUser?.email,
        building.fsmEmail,
        building.assignedFsmEmail,
        "-"
      ),
      contactNumber: firstReportValue(
        fsmUser?.phoneNumber,
        fsmUser?.contactNumber,
        building.fsmContactNumber,
        building.assignedFsmContactNumber,
        "-"
      )
    }
  };
};

const formatFloorArea = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "-") return "-";
  return /(?:m²|m2|sq\.?\s*m)/i.test(normalized) ? normalized : `${normalized} m²`;
};

const getAnnualTrainingRows = (building, year) => {
  const records = firstReportValue(
    building?.trainingRecords,
    building?.fireSafetyTraining,
    building?.trainingActivities
  );
  const matchingRecords = Array.isArray(records)
    ? records.filter((record) => {
        const date = parseDate(record.date || record.dateFrom || record.trainingDate);
        const recordYear = Number(record.year);
        return (!date && !recordYear) || date?.getFullYear() === year || recordYear === year;
      })
    : [];

  if (matchingRecords.length > 0) {
    return matchingRecords.map((record) => [
      record.category || record.audience || "Others",
      fmtDate(record.dateFrom || record.date || record.trainingDate),
      fmtDate(record.dateTo || record.date || record.trainingDate),
      record.description || record.briefDescription || record.trainingDescription || "-",
      String(firstReportValue(record.participants, record.numberOfParticipants, record.attendance, "-"))
    ]);
  }

  return [
    ["Occupants / Tenants", "-", "-", "-", "-"],
    ["Company Emergency Response Team (CERT)", "-", "-", "-", "-"],
    ["Fire Wardens", "-", "-", "-", "-"],
    ["Others (please specify)", "-", "-", "-", "-"]
  ];
};

const getAnnualWorksRows = (building, year) => {
  const works = firstReportValue(
    building?.fireSafetyWorks,
    building?.improvementWorks,
    building?.fireSafetyImprovements
  );
  const matchingWorks = Array.isArray(works)
    ? works.filter((work) => {
        const date = parseDate(work.date || work.implementationDate || work.dateOfImplementation);
        const workYear = Number(work.year);
        return (!date && !workYear) || date?.getFullYear() === year || workYear === year;
      })
    : [];

  return matchingWorks.length > 0
    ? matchingWorks.map((work) => [
        work.type || work.workType || "-",
        work.description || work.details || "-",
        fmtDate(work.implementationDate || work.dateOfImplementation || work.date)
      ])
    : [["NIL", "NIL", "NIL"]];
};

const getCertMembersText = (building) => {
  const members = firstReportValue(
    building?.certMembers,
    building?.trainedCertMembers,
    building?.emergencyTeamMembers
  );
  if (!Array.isArray(members) || members.length === 0) return "-";
  return members.map((member, index) => {
    if (typeof member === "string") return `${index + 1}. ${member}`;
    const name = member.name || member.fullName || "Unnamed member";
    const role = member.role || member.designation;
    return `${index + 1}. ${name}${role ? ` (${role})` : ""}`;
  }).join("\n");
};

const getOtherFireSafetyActionsText = (building) => {
  const actions = firstReportValue(
    building?.maintenanceActions,
    building?.otherFireSafetyActions
  );
  if (Array.isArray(actions)) {
    const actionText = actions
      .map((action) =>
        typeof action === "string"
          ? action
          : action.description || action.action || action.details || ""
      )
      .filter(Boolean)
      .join("\n");
    if (actionText) return actionText;
  } else if (actions) {
    return String(actions);
  }
  return "System vendors tested and serviced the fire protection systems in accordance with the maintenance contracts. Defective or substandard devices are to be replaced or rectified.";
};

// ─── Custom Report ────────────────────────────────────────────────────────────

export const generateCustomReport = async ({
  reportType = "Monthly",
  sections = {},
  month = 1,
  year = new Date().getFullYear(),
  dateFrom,
  dateTo,
  customTitle,
  openingRemarks,
  buildings = [],
  fireDrills = [],
  inspections = [],
  inspectionResults = [],
  issues = [],
  users = [],
  generatedBy = "Admin"
}) => {
  const docxNS = await loadDocx();
  const { Document, Packer, Paragraph } = docxNS;
  const H = buildHelpers(docxNS);
  const { txt, para, centered, spacer, h1, h2, makeTable, infoTable } = H;

  const buildingMap = new Map(buildings.map((b) => [b.id, b]));
  const today = new Date();

  // ── Resolve period & filter data ──
  let drills, insp, iss, periodLabel, issueSnapshot;
  const selectedBuildingIds = getBuildingIds(buildings);

  if (reportType === "DateRange") {
    drills = filterByBuildings(filterDrillsByDateRange(fireDrills, dateFrom, dateTo), selectedBuildingIds);
    insp   = filterByBuildings(filterByDateRange(inspections, "inspectionDate", dateFrom, dateTo), selectedBuildingIds);
    const selectedIssues = filterByBuildings(issues, selectedBuildingIds);
    const bounds = getDateRangeBounds(dateFrom, dateTo);
    issueSnapshot = buildIssuePeriodSnapshot(selectedIssues, bounds.start, bounds.end);
    iss = issueSnapshot.relevant.map((record) => ({
      ...record.issue,
      reportStatus: record.statusAtEnd,
      reportActivity: record.activity
    }));
    const df = dateFrom ? parseDate(dateFrom) : null;
    const dt = dateTo   ? parseDate(dateTo)   : null;
    periodLabel = [df && fmtDate(df), dt && fmtDate(dt)].filter(Boolean).join(" – ") || "Custom Period";
  } else if (reportType === "Annual") {
    drills = filterByBuildings(filterDrillsByYear(fireDrills, year), selectedBuildingIds);
    insp   = filterByBuildings(filterByYear(inspections, "inspectionDate", year), selectedBuildingIds);
    iss    = filterByBuildings(filterByYear(issues, "createdAt", year), selectedBuildingIds);
    periodLabel = String(year);
  } else {
    drills = filterByBuildings(filterDrillsByMonth(fireDrills, month, year), selectedBuildingIds);
    insp   = filterByBuildings(filterByMonth(inspections, "inspectionDate", month, year), selectedBuildingIds);
    const selectedIssues = filterByBuildings(issues, selectedBuildingIds);
    const bounds = getMonthBounds(month, year);
    issueSnapshot = buildIssuePeriodSnapshot(selectedIssues, bounds.start, bounds.end);
    iss = issueSnapshot.relevant.map((record) => ({
      ...record.issue,
      reportStatus: record.statusAtEnd,
      reportActivity: record.activity
    }));
    periodLabel = `${MONTHS[month - 1]} ${year}`;
  }

  const filteredInspectionResults = getResultsForInspections(insp, inspectionResults);
  const checklistSummary = getChecklistSummary(filteredInspectionResults);
  const appendixAEntries = buildAppendixAEntries(filteredInspectionResults);

  const primaryBuilding = buildings.length === 1 ? buildings[0] : null;
  const buildingName = primaryBuilding
    ? (primaryBuilding.buildingName || primaryBuilding.building_name || primaryBuilding.id)
    : "All Buildings";
  const buildingAddress = primaryBuilding?.address || "-";
  const { owner, fsm } = getAnnualReportParties(primaryBuilding || {}, users, generatedBy);

  const title = (customTitle || "").trim() || `Custom Fire Safety Report — ${periodLabel}`;
  const sec = sections;
  const fireDrillPhotoChildren =
    reportType === "Annual" && sec.drills !== false
      ? await buildAnnualFireDrillPhotoChildren({
          docxNS,
          drills,
          buildingMap,
          h1,
          h2,
          para,
          txt,
          spacer
        })
      : [];

  // ── Cover ──
  const children = [
    centered([txt("CBRE PTE LTD", { bold: true, size: 32 })]),
    centered([txt("FIRE SAFETY MANAGER", { bold: true, size: 26 })]),
    centered([txt(title.toUpperCase(), { bold: true, size: 24 })]),
    spacer(),
    infoTable([
      ["Report Title", title],
      ["Period", periodLabel],
      ["Building(s)", buildingName],
      ["Prepared By", generatedBy],
      ["Date of Report", fmtDate(today)],
      ...(openingRemarks ? [["Opening Remarks", openingRemarks]] : [])
    ]),
    spacer(),
    spacer()
  ];

  // ─── Monthly / DateRange sections ───────────────────────────────────────────
  if (reportType !== "Annual") {
    const openIssues = issueSnapshot.outstanding;

    if (sec.summary !== false) {
      children.push(
        h1("EXECUTIVE SUMMARY"),
        spacer(),
        makeTable(
          ["Metric", "Value"],
          [
            ["Inspections Conducted", String(insp.length)],
            ["Checklist Items Answered", String(checklistSummary.answered)],
            ["Checklist Items Passed", String(checklistSummary.passed)],
            ["Checklist Defects Found", String(checklistSummary.failed)],
            ["Checklist Items N.A.", String(checklistSummary.notApplicable)],
            ["Issues Created in Period", String(issueSnapshot.created.length)],
            ["Outstanding at Period End", String(openIssues.length)],
            ["Resolved / Closed in Period", String(issueSnapshot.resolved.length)]
          ],
          [3000, 6360]
        ),
        spacer(), spacer()
      );
    }

    if (sec.inspections !== false) {
      children.push(h1("INSPECTION RECORDS"), spacer());
      if (insp.length === 0) {
        children.push(para("No inspections were conducted during this period."));
      } else {
        children.push(
          makeTable(
            ["S/No", "Building", "Type", "Date", "Status", "Remarks"],
            insp.map((i, idx) => {
              const b = buildingMap.get(i.buildingId);
              return [
                String(idx + 1),
                b ? (b.buildingName || b.building_name || i.buildingId) : (i.buildingId || "-"),
                i.inspectionType || "-",
                fmtDate(i.inspectionDate),
                i.status || "-",
                i.generalRemarks || "-"
              ];
            }),
            [400, 1800, 2000, 1400, 1200, 2560]
          )
        );
      }
      children.push(spacer(), spacer());
    }

    if (sec.checklistResults !== false) {
      children.push(
        h1("INSPECTION CHECKLIST RESULTS"),
        spacer(),
        ...buildChecklistResultChildren({
          inspections: insp,
          inspectionResults,
          buildingMap,
          h2,
          para,
          txt,
          makeTable,
          spacer
        }),
        spacer()
      );
    }

    if (sec.issues !== false) {
      children.push(h1("ISSUES & DEFECTS"), spacer());
      if (iss.length === 0) {
        children.push(para("No issues were recorded during this period."));
      } else {
        children.push(
          makeTable(
              ["S/No", "Building", "Location", "Finding", "Priority", "Month-End Status", "Monthly Activity", "Rectification"],
            iss.map((i, idx) => {
              const b = buildingMap.get(i.buildingId);
              return [
                String(idx + 1),
                b ? (b.buildingName || b.building_name || i.buildingId) : (i.buildingId || "-"),
                i.location || i.floorName || "-",
                i.issueTitle || i.issueDescription || "-",
                i.priority || "Medium",
                i.reportStatus || i.status || "Open",
                i.reportActivity || "-",
                i.rectification || "Pending"
              ];
            }),
            [350, 1100, 950, 1450, 700, 900, 1650, 2260]
          )
        );
      }
      children.push(spacer(), spacer());
    }

    if (sec.observations !== false) {
      children.push(
        h1("GENERAL OBSERVATIONS"),
        spacer(),
        para("All fire safety systems were inspected and found to be in general working order. Any defects identified have been recorded in the Issues section above and communicated to the building owner / management for rectification."),
        spacer(), spacer()
      );
    }

    if (sec.appendixA !== false) {
      children.push(
        new Paragraph({
          children: [txt("APPENDIX A — DETAILED FINDINGS", { bold: true, size: 24, underline: {} })],
          pageBreakBefore: true,
          spacing: { before: 0, after: 200 }
        }),
        para([txt("Property:  ", { bold: true }), txt(buildingName)]),
        para([txt("Period:  ", { bold: true }), txt(periodLabel)]),
        spacer()
      );
      if (appendixAEntries.length === 0) {
        children.push(para("No findings to report for this period."));
      } else {
        children.push(
          makeTable(
            ["S/No", "Location", "Photographs", "Findings", "Remarks / Proposed Rectification"],
            appendixAEntries.map((entry, idx) => [
              String(idx + 1).padStart(2, "0"),
              entry.location,
              entry.photographs,
              entry.findings,
              entry.remarks
            ]),
            [400, 1600, 1800, 2400, 3160]
          )
        );
      }
      children.push(spacer());
    }
  }

  // ─── Annual sections ─────────────────────────────────────────────────────────
  if (reportType === "Annual") {
    const noOfStoreys  = primaryBuilding?.noOfStoreys || "-";
    const gfa          = primaryBuilding?.grossFloorAreaGfa || "-";
    const occupantLoad = primaryBuilding?.occupantLoad || "-";
    const nextYear     = year + 1;

    if (sec.buildingInfo !== false) {
      children.push(
        h1("1. BUILDING INFORMATION"),
        spacer(),
        infoTable([
          ["Name of Building", buildingName],
          ["Address", buildingAddress],
          ["No. of Storeys", String(noOfStoreys)],
          ["Gross Floor Area (GFA)", formatFloorArea(gfa)],
          ["Occupant Load (OL)", String(occupantLoad)]
        ]),
        spacer(), spacer()
      );
    }

    if (sec.buildingOwners !== false) {
      children.push(
        h1("2. BUILDING OWNER(S)"),
        spacer(),
        makeTable(
          ["Name", "Email Address", "Contact Number"],
          [[owner.name, owner.email, owner.contactNumber]],
          [3200, 3600, 2560]
        ),
        spacer(), spacer()
      );
    }

    if (sec.epMeasures !== false) {
      children.push(
        h1("3. PROVISION OF EMERGENCY PREPAREDNESS (EP) MEASURES"),
        spacer(),
        makeTable(
          ["S/No", "EP Measure", "Details"],
          [
            ["1", "Updated Emergency Response Plan (ERP)", `Updated: ${firstReportValue(primaryBuilding?.erpUpdated, "-")}\nDate of updated ERP: ${fmtDate(primaryBuilding?.erpUpdatedDate)}`],
            ["2", "Validity of Fire Certificate (FC)", `From: ${fmtDate(primaryBuilding?.fireCertificateValidFrom)}\nTo: ${fmtDate(primaryBuilding?.fireCertificateValidTo)}`],
            ["3", "Name of Appointed FSM", `${fsm.name}\nContact No.: ${fsm.contactNumber}\nEmail: ${fsm.email}`],
            ["4", "Details of Trained CERT Members", getCertMembersText(primaryBuilding)]
          ],
          [500, 3000, 5860]
        ),
        spacer(), spacer()
      );
    }

    children.push(h1("4. DETAILS OF ANNUAL FIRE SAFETY REPORT"), spacer());

    if (sec.training !== false) {
      children.push(
        h1("4.1 RECORD OF TRAINING CONDUCTED"),
        spacer(),
        makeTable(
          ["Category", "From", "To", "Brief Description of Training", "No. of Participants"],
          getAnnualTrainingRows(primaryBuilding, year),
          [1800, 1200, 1200, 3360, 1800]
        ),
        spacer(), spacer()
      );
    }

    if (sec.works !== false) {
      children.push(
        h1("4.2 RECORDS OF FIRE SAFETY WORKS, IMPROVEMENT OF BUILDING STRUCTURE, LAYOUT, FIRE PROTECTION SYSTEMS AND OTHER FIRE SAFETY MEASURES"),
        spacer(),
        makeTable(
          ["Type of Works / Improvement", "Description of Works / Improvement", "Date of Implementation"],
          getAnnualWorksRows(primaryBuilding, year),
          [2800, 4160, 2400]
        ),
        spacer(), spacer()
      );
    }

    if (sec.drills !== false) {
      children.push(h1("4.3 FIRE EVACUATION DRILLS CONDUCTED"), spacer());
      if (drills.length === 0) {
        children.push(para("No fire drills were conducted during this period."));
      } else {
        children.push(
          makeTable(
            ["S/N", "Date", "No. of Occupants", "No. of Participants", "Time Taken for Evacuation", "Issues Faced"],
            drills.map((d, idx) => {
              return [
                String(idx + 1).padStart(2, "0"),
                fmtDateShort(getFireDrillReportDate(d)),
                d.numberOfOccupants || d.occupants || occupantLoad,
                d.actualParticipants || d.participantsAttended || d.participants || "-",
                d.totalEvacuationTime || d.evacuationTime || "-",
                d.issueFound || d.observations || "N/A"
              ];
            }),
            [500, 1200, 1500, 1500, 1900, 2760]
          )
        );
      }
      children.push(spacer(), spacer());
    }

    if (sec.drillReview !== false) {
      children.push(h1("REVIEW OF FIRE EVACUATION DRILLS"), spacer());
      const reviewDrills = drills.filter((d) => d.recommendations || d.followUpIssues || d.observations);
      children.push(
        makeTable(
          ["S/N", "Issues Faced", "Recommendations"],
          reviewDrills.length === 0
            ? [["1", "N/A", "Drills conducted satisfactorily."]]
            : reviewDrills.map((d, idx) => [
                String(idx + 1),
                d.observations || d.issueFound || "-",
                d.recommendations || d.followUpIssues || "Follow-up required"
              ]),
          [400, 4000, 4960]
        ),
        spacer(), spacer()
      );
    }

    if (sec.drills !== false) {
      children.push(...fireDrillPhotoChildren);
    }

    if (sec.findings !== false) {
      children.push(h1("4.4 FINDINGS OF FIRE SAFETY CHECKS & RECTIFICATION WORKS"), spacer());
      children.push(
        makeTable(
          ["S/N", "Date", "Building", "Issue Identified", "Rectification Taken"],
          iss.length === 0
            ? [["1", "-", "-", "No issues identified", "N/A"]]
            : iss.map((i, idx) => {
                const b = buildingMap.get(i.buildingId);
                return [
                  String(idx + 1),
                  fmtDateShort(i.createdAt),
                  b ? (b.buildingName || b.building_name || i.buildingId) : (i.buildingId || "-"),
                  i.issueTitle || i.issueDescription || "-",
                  i.rectification || (isIssueResolved(i) ? "Completed" : "Pending")
                ];
              }),
          [400, 1200, 1600, 3000, 3160]
        ),
        spacer(), spacer()
      );
    }

    if (sec.schedule !== false) {
      children.push(
        h1("4.5 SCHEDULE OF FIRE SAFETY ACTIVITIES FOR THE NEXT 12 MONTHS"),
        spacer(),
        makeTable(
          ["S/N", "From", "To", "Activity"],
          [
            ["1", `Jan ${nextYear}`, `Dec ${nextYear}`, "Monthly on-site fire safety inspections"],
            ["2", `Apr ${nextYear}`, `Apr ${nextYear}`, "Fire Warden Briefing / Table-Top Exercise"],
            ["3", `May ${nextYear}`, `May ${nextYear}`, "Annual Fire Evacuation Drill"],
            ["4", `Aug ${nextYear}`, `Aug ${nextYear}`, "Fire Safety Equipment Servicing Review"],
            ["5", `Sep ${nextYear}`, `Sep ${nextYear}`, "Basic Fire Fighting Hands-on Training"]
          ],
          [400, 1200, 1200, 6560]
        ),
        spacer(), spacer()
      );
    }

    if (sec.mattersArising !== false) {
      const outstanding = iss.filter((i) => !isIssueResolved(i));
      children.push(
        h1("4.6 MATTERS ARISING FROM PREVIOUS REPORT"),
        spacer(),
        makeTable(
          ["S/N", "Issue(s)", "Action(s) Taken"],
          outstanding.length === 0
            ? [["1", "No outstanding issues from previous report.", "N/A"]]
            : outstanding.map((i, idx) => [
                String(idx + 1),
                i.issueTitle || i.issueDescription || "-",
                i.rectification || "Pending — follow-up in progress"
              ]),
          [400, 4000, 4960]
        ),
        spacer(), spacer()
      );
    }

    if (sec.arsonPlan !== false) {
      children.push(
        h1("4.7 ARSON PREVENTION PLAN (APP)"),
        spacer(),
        h2("A) Identifying Critical Locations of Fire Safety Systems"),
        para("• Ensure the Genset room, Switch Room, and Lift Motor Room are always neat and tidy."),
        para("• Ensure there is no leakage in the petroleum storage area."),
        para("• All fire protection equipment rooms are to remain locked and accessible only to authorised personnel."),
        spacer(),
        h2("B) Identifying Fire Hazards"),
        para("• Regular checks to be conducted to ensure no accumulation of combustible materials in common areas."),
        para("• All discarded items and rubbish to be disposed of promptly."),
        spacer(),
        h2("C) Preventive Measures"),
        para("• CCTV surveillance maintained at all entry/exit points and fire risk areas."),
        para("• All abnormalities to be reported to the FSM immediately."),
        spacer(), spacer()
      );
    }

    if (sec.otherActions !== false) {
      children.push(
        h1("4.8 ANY OTHER ACTIONS TAKEN TO IMPROVE FIRE SAFETY"),
        spacer(),
        h2("1. MAINTENANCE"),
        para(getOtherFireSafetyActionsText(primaryBuilding)),
        spacer(), spacer()
      );
    }

    if (sec.fsmDeclaration !== false) {
      children.push(
        h1("5. DECLARATION BY FSM"),
        spacer(),
        makeTable(
          ["Declaration", "Signature"],
          [[
            `I, ${fsm.name}, hereby declare that I have prepared this Annual Fire Safety Report accurately to the best of my knowledge. I have also submitted this report to the building owner on ${fmtDate(today)}.`,
            "\n\n\n"
          ]],
          [6200, 3160]
        ),
        spacer(), spacer()
      );
    }

    if (sec.ownerDeclaration !== false) {
      children.push(
        h1("6. DECLARATION BY BUILDING OWNER"),
        spacer(),
        makeTable(
          ["Declaration", "Signature"],
          [[
            `I, ${owner.name}, hereby declare that I have reviewed the Annual Fire Safety Report with my Fire Safety Manager on ${fmtDate(today)}. I understand that this includes rectifying the fire safety issues identified and ensuring the required Emergency Preparedness measures are in place at my premises.`,
            "\n\n\n"
          ]],
          [6200, 3160]
        ),
        spacer(), spacer()
      );
    }
  }

  if (reportType !== "Annual") {
    children.push(
      h1("CERTIFICATION"),
      spacer(),
      para("I hereby certify that the above information is accurate and the fire safety activities have been carried out in accordance with the requirements of the Fire Safety Act (Cap. 109A)."),
      spacer(), spacer(),
      para([txt("Name of Fire Safety Manager:  ", { bold: true }), txt(generatedBy)]),
      spacer(),
      para([txt("Signature:  ", { bold: true }), txt("_______________________________")]),
      spacer(),
      para([txt("Date:  ", { bold: true }), txt(fmtDate(today))]),
      spacer()
    );
  }
  children.push(centered([txt("— End of Report —", { italics: true, color: "6B7280" })]));

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const safeTitle = title.replace(/[^a-zA-Z0-9\s_-]/g, "").replace(/\s+/g, "_").slice(0, 60);
  saveAs(blob, `${safeTitle}.docx`);
};
