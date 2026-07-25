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

const filterDrillsByMonth = (drills, month, year) => {
  const pad = String(month).padStart(2, "0");
  const prefix = `${year}-${pad}`;
  return drills.filter((d) => {
    const dateStr = d.drillDate || d.actualDate || "";
    if (typeof dateStr === "string" && dateStr.startsWith(prefix)) return true;
    const date = parseDate(d.drillDate || d.actualDate);
    return date && date.getMonth() + 1 === month && date.getFullYear() === year;
  });
};

const filterDrillsByYear = (drills, year) =>
  drills.filter((d) => {
    const dateStr = d.drillDate || d.actualDate || "";
    if (typeof dateStr === "string" && dateStr.startsWith(String(year))) return true;
    const date = parseDate(d.drillDate || d.actualDate);
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
    const raw = d.drillDate || d.actualDate || "";
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
  fireDrills,
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
  const drills = filterByBuildings(filterDrillsByMonth(fireDrills, month, year), selectedBuildingIds);
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
        ["Fire Drills Conducted", String(drills.length)],
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

    // ── Section 3: Fire Drill Records ──
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

    h1("SECTION 4: FIRE DRILL RECORDS"),
    spacer(),
    ...(drills.length === 0
      ? [para("No fire drills were conducted during this period.")]
      : [
          makeTable(
            ["S/No", "Building", "Type", "Date", "Participants", "Evacuation Time", "Result"],
            drills.map((d, idx) => {
              const bldg = buildingMap.get(d.buildingId);
              const bldgName = bldg
                ? (bldg.buildingName || bldg.building_name || d.buildingId)
                : (d.buildingName || d.buildingId || "-");
              return [
                String(idx + 1),
                bldgName,
                d.drillType || "Standard Fire Drill",
                d.actualDate || d.drillDate || "-",
                d.participants || "-",
                d.totalEvacuationTime || d.evacuationTime || "-",
                d.performanceStatus || d.status || "-"
              ];
            }),
            [400, 1600, 1400, 1200, 1000, 1600, 1160]
          ),
          spacer(),
          ...drills
            .filter((d) => d.observations || d.recommendations)
            .map((d) => {
              const bldg = buildingMap.get(d.buildingId);
              const bldgName = bldg
                ? (bldg.buildingName || bldg.building_name || d.buildingId)
                : (d.buildingName || "-");
              return [
                ...(d.observations
                  ? [para([txt(`${bldgName} — Observations: `, { bold: true }), txt(d.observations)])]
                  : []),
                ...(d.recommendations
                  ? [para([txt(`${bldgName} — Recommendations: `, { bold: true }), txt(d.recommendations)])]
                  : [])
              ];
            })
            .flat()
        ]),
    spacer(),
    spacer(),

    // ── Section 4: Issues / Findings ──
    h1("SECTION 5: ISSUES / DEFECTS IDENTIFIED"),
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
    h1("SECTION 6: GENERAL OBSERVATIONS / REMARKS"),
    spacer(),
    para("All fire safety systems were inspected and found to be in general working order. Any defects identified have been recorded in Section 5 above and communicated to the building owner / management for rectification."),
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
  fireDrills = [],
  inspections = [],
  inspectionResults = [],
  issues = [],
  generatedBy = "Admin"
}) => {
  const monthLabel = MONTHS[month - 1];
  const buildingMap = new Map(buildings.map((b) => [b.id, b]));
  const selectedBuildingIds = getBuildingIds(buildings);
  const drills = filterByBuildings(filterDrillsByMonth(fireDrills, month, year), selectedBuildingIds);
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

  const drillRows = drills.map((drill, idx) => [
    String(idx + 1),
    getBuildingName(buildingMap, drill.buildingId) || drill.buildingName || "-",
    drill.drillType || "Standard Fire Drill",
    drill.actualDate || drill.drillDate || "-",
    drill.participants || "-",
    drill.totalEvacuationTime || drill.evacuationTime || "-",
    drill.performanceStatus || drill.status || "-"
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
            ["Fire Drills Conducted", String(drills.length)],
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

        <h2>Fire Drill Records</h2>
        ${
          drillRows.length
            ? renderHtmlTable(["S/No", "Building", "Type", "Date", "Participants", "Evacuation Time", "Result"], drillRows)
            : "<p>No fire drills were conducted during this period.</p>"
        }

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
  generatedBy
}) => {
  const docxNS = await loadDocx();
  const { Document, Packer } = docxNS;
  const { txt, para, centered, spacer, h1, h2, makeTable, infoTable } = buildHelpers(docxNS);

  const buildingMap = new Map(buildings.map((b) => [b.id, b]));

  const yearDrills = filterDrillsByYear(fireDrills, year);
  const yearIssues = filterByYear(issues, "createdAt", year);

  // One report per building group, or combined if multiple
  const primaryBuilding = buildings.length === 1 ? buildings[0] : null;
  const buildingName = primaryBuilding
    ? (primaryBuilding.buildingName || primaryBuilding.building_name || primaryBuilding.id)
    : "All Buildings";
  const buildingAddress = primaryBuilding?.address || "-";
  const noOfStoreys = primaryBuilding?.noOfStoreys || "-";
  const gfa = primaryBuilding?.grossFloorAreaGfa || "-";
  const occupantLoad = primaryBuilding?.occupantLoad || "-";

  // Next 12 months schedule
  const nextYear = year + 1;
  const scheduleRows = [
    ["1", `Jan ${nextYear}`, `Dec ${nextYear}`, "Monthly on-site fire safety inspections"],
    ["2", `Apr ${nextYear}`, `Apr ${nextYear}`, "Fire Warden Briefing / Table-Top Exercise"],
    ["3", `May ${nextYear}`, `May ${nextYear}`, "Fire Evacuation Drill (1st)"],
    ["4", `Aug ${nextYear}`, `Aug ${nextYear}`, "Fire Safety Equipment Servicing Review"],
    ["5", `Sep ${nextYear}`, `Sep ${nextYear}`, "Basic Fire Fighting Hands-on Training"],
    ["6", `Nov ${nextYear}`, `Nov ${nextYear}`, "Fire Evacuation Drill (2nd)"]
  ];

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
    h1("BUILDING INFORMATION"),
    spacer(),
    infoTable([
      ["Name of Building", buildingName],
      ["Address", buildingAddress],
      ["No. of Storeys", String(noOfStoreys)],
      ["Gross Floor Area (GFA)", gfa ? `${gfa} m²` : "-"],
      ["Occupant Load (OL)", String(occupantLoad)]
    ]),
    spacer(),
    spacer(),

    // ── EP Measures ──
    h1("PROVISION OF EMERGENCY PREPAREDNESS (EP) MEASURES"),
    spacer(),
    makeTable(
      ["S/No", "EP Measure", "Details"],
      [
        ["1", "Emergency Response Plan (ERP)", "Updated annually — refer to Building Management"],
        ["2", "Validity of Fire Certificate (FC)", "Please verify with SCDF records"],
        ["3", "Name of Appointed FSM", generatedBy],
        ["4", "CERT Members", "As per building emergency team register"]
      ],
      [500, 3000, 5860]
    ),
    spacer(),
    spacer(),

    // ── Training Records ──
    h1("RECORD OF TRAINING CONDUCTED"),
    spacer(),
    makeTable(
      ["Category", "Date", "Description", "No. of Participants"],
      [
        ["Occupants / Tenants", `${year}`, "Annual Fire Safety Briefing", "-"],
        ["Company Emergency Response Team (CERT)", `${year}`, "CERT Training / Table-Top Exercise", "-"],
        ["Fire Wardens", `${year}`, "Fire Warden Briefing", "-"]
      ],
      [2000, 1200, 4000, 2160]
    ),
    spacer(),
    spacer(),

    // ── Fire Drills ──
    h1("FIRE EVACUATION DRILLS CONDUCTED"),
    spacer(),
    ...(yearDrills.length === 0
      ? [para("No fire drills were conducted during this period.")]
      : [
          makeTable(
            ["S/N", "Building", "Date", "Participants", "Time Taken", "Issues Faced", "Result"],
            yearDrills.map((d, idx) => {
              const bldg = buildingMap.get(d.buildingId);
              const bldgName = bldg
                ? (bldg.buildingName || bldg.building_name || d.buildingId)
                : (d.buildingName || "-");
              return [
                String(idx + 1).padStart(2, "0"),
                bldgName,
                d.actualDate || d.drillDate || "-",
                d.participants || "-",
                d.totalEvacuationTime || d.evacuationTime || "-",
                d.issueFound || d.observations || "N/A",
                d.performanceStatus || d.status || "-"
              ];
            }),
            [400, 1600, 1200, 1000, 1200, 2400, 1160]
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

    // ── Findings & Rectification ──
    h1("FINDINGS OF FIRE SAFETY CHECKS & RECTIFICATION WORKS"),
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
    h1(`SCHEDULE OF FIRE SAFETY ACTIVITIES FOR ${nextYear}`),
    spacer(),
    makeTable(
      ["S/N", "From", "To", "Brief Description of Activity"],
      scheduleRows,
      [400, 1200, 1200, 6560]
    ),
    spacer(),
    spacer(),

    // ── Matters Arising ──
    h1("MATTERS ARISING FROM PREVIOUS REPORT"),
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
    h1("ARSON PREVENTION PLAN (APP)"),
    spacer(),
    h2("A) Identifying Critical Locations of Fire Safety Systems"),
    para("• Ensure the Genset room, Switch Room, and Lift Motor Room are always neat and tidy."),
    para("• Ensure there is no leakage in the petroleum storage area."),
    para("• All fire protection equipment rooms are to remain locked and accessible only to authorised personnel."),
    spacer(),
    h2("B) Identifying Fire Hazards"),
    para("• Regular checks to be conducted to ensure no accumulation of combustible materials in common areas."),
    para("• All discarded items and rubbish to be disposed of promptly."),
    para("• Storage areas to be inspected monthly for fire hazard compliance."),
    spacer(),
    h2("C) Preventive Measures"),
    para("• CCTV surveillance maintained at all entry/exit points and fire risk areas."),
    para("• All abnormalities to be reported to the FSM immediately."),
    para("• Building Management to ensure contractor activities are supervised at all times."),
    spacer(),
    spacer(),

    // ── Signature ──
    h1("CERTIFICATION"),
    spacer(),
    para("I hereby certify that this Annual Fire Safety Report has been prepared accurately and reflects the fire safety activities conducted during the year in accordance with the requirements of the Fire Safety Act (Cap. 109A)."),
    spacer(),
    spacer(),
    para([txt("Name of Fire Safety Manager:  ", { bold: true }), txt(generatedBy)]),
    spacer(),
    para([txt("Signature:  ", { bold: true }), txt("_______________________________")]),
    spacer(),
    para([txt("Date:  ", { bold: true }), txt(fmtDate(new Date()))]),
    spacer(),
    spacer(),

    centered([txt("— End of Annual Fire Safety Report —", { italics: true, color: "6B7280" })])
  ];

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `FSM_Annual_Report_${year}.docx`);
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

  const title = (customTitle || "").trim() || `Custom Fire Safety Report — ${periodLabel}`;
  const sec = sections;

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
            ["Fire Drills Conducted", String(drills.length)],
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

    if (sec.drills !== false) {
      children.push(h1("FIRE DRILL RECORDS"), spacer());
      if (drills.length === 0) {
        children.push(para("No fire drills were conducted during this period."));
      } else {
        children.push(
          makeTable(
            ["S/No", "Building", "Type", "Date", "Participants", "Evacuation Time", "Result"],
            drills.map((d, idx) => {
              const b = buildingMap.get(d.buildingId);
              return [
                String(idx + 1),
                b ? (b.buildingName || b.building_name || d.buildingId) : (d.buildingName || "-"),
                d.drillType || "Standard Fire Drill",
                d.actualDate || d.drillDate || "-",
                d.participants || "-",
                d.totalEvacuationTime || d.evacuationTime || "-",
                d.performanceStatus || d.status || "-"
              ];
            }),
            [400, 1500, 1400, 1200, 1000, 1600, 1260]
          )
        );
      }
      children.push(spacer(), spacer());
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
        h1("BUILDING INFORMATION"),
        spacer(),
        infoTable([
          ["Name of Building", buildingName],
          ["Address", buildingAddress],
          ["No. of Storeys", String(noOfStoreys)],
          ["Gross Floor Area (GFA)", gfa ? `${gfa} m²` : "-"],
          ["Occupant Load (OL)", String(occupantLoad)]
        ]),
        spacer(), spacer()
      );
    }

    if (sec.epMeasures !== false) {
      children.push(
        h1("PROVISION OF EMERGENCY PREPAREDNESS (EP) MEASURES"),
        spacer(),
        makeTable(
          ["S/No", "EP Measure", "Details"],
          [
            ["1", "Emergency Response Plan (ERP)", "Updated annually — refer to Building Management"],
            ["2", "Validity of Fire Certificate (FC)", "Please verify with SCDF records"],
            ["3", "Name of Appointed FSM", generatedBy],
            ["4", "CERT Members", "As per building emergency team register"]
          ],
          [500, 3000, 5860]
        ),
        spacer(), spacer()
      );
    }

    if (sec.training !== false) {
      children.push(
        h1("RECORD OF TRAINING CONDUCTED"),
        spacer(),
        makeTable(
          ["Category", "Date", "Description", "No. of Participants"],
          [
            ["Occupants / Tenants", `${year}`, "Annual Fire Safety Briefing", "-"],
            ["CERT", `${year}`, "CERT Training / Table-Top Exercise", "-"],
            ["Fire Wardens", `${year}`, "Fire Warden Briefing", "-"]
          ],
          [2000, 1200, 4000, 2160]
        ),
        spacer(), spacer()
      );
    }

    if (sec.drills !== false) {
      children.push(h1("FIRE EVACUATION DRILLS CONDUCTED"), spacer());
      if (drills.length === 0) {
        children.push(para("No fire drills were conducted during this period."));
      } else {
        children.push(
          makeTable(
            ["S/N", "Building", "Date", "Participants", "Time", "Issues", "Result"],
            drills.map((d, idx) => {
              const b = buildingMap.get(d.buildingId);
              return [
                String(idx + 1).padStart(2, "0"),
                b ? (b.buildingName || b.building_name || d.buildingId) : (d.buildingName || "-"),
                d.actualDate || d.drillDate || "-",
                d.participants || "-",
                d.totalEvacuationTime || d.evacuationTime || "-",
                d.issueFound || d.observations || "N/A",
                d.performanceStatus || d.status || "-"
              ];
            }),
            [400, 1600, 1200, 1000, 1200, 2400, 1160]
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

    if (sec.findings !== false) {
      children.push(h1("FINDINGS OF FIRE SAFETY CHECKS & RECTIFICATION WORKS"), spacer());
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
        h1(`SCHEDULE OF FIRE SAFETY ACTIVITIES FOR ${nextYear}`),
        spacer(),
        makeTable(
          ["S/N", "From", "To", "Activity"],
          [
            ["1", `Jan ${nextYear}`, `Dec ${nextYear}`, "Monthly on-site fire safety inspections"],
            ["2", `Apr ${nextYear}`, `Apr ${nextYear}`, "Fire Warden Briefing / Table-Top Exercise"],
            ["3", `May ${nextYear}`, `May ${nextYear}`, "Fire Evacuation Drill (1st)"],
            ["4", `Aug ${nextYear}`, `Aug ${nextYear}`, "Fire Safety Equipment Servicing Review"],
            ["5", `Sep ${nextYear}`, `Sep ${nextYear}`, "Basic Fire Fighting Hands-on Training"],
            ["6", `Nov ${nextYear}`, `Nov ${nextYear}`, "Fire Evacuation Drill (2nd)"]
          ],
          [400, 1200, 1200, 6560]
        ),
        spacer(), spacer()
      );
    }

    if (sec.mattersArising !== false) {
      const outstanding = iss.filter((i) => !isIssueResolved(i));
      children.push(
        h1("MATTERS ARISING FROM PREVIOUS REPORT"),
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
        h1("ARSON PREVENTION PLAN (APP)"),
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
  }

  // ── Certification (always) ──
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
    spacer(),
    centered([txt("— End of Report —", { italics: true, color: "6B7280" })])
  );

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const safeTitle = title.replace(/[^a-zA-Z0-9\s_-]/g, "").replace(/\s+/g, "_").slice(0, 60);
  saveAs(blob, `${safeTitle}.docx`);
};
