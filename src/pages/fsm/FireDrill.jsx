import React, { useMemo, useState } from "react";
import { useAuthContext } from "../../context/AuthContext";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";
import {
  completeFireDrill,
  createFireDrill
} from "../../services/fireDrillService";
import { uploadFile } from "../../services/storageService";

const emptyScheduleForm = {
  buildingId: "",
  buildingName: "",
  drillDate: "",
  drillTime: "",
  drillEndTime: "",
  drillType: "",
  scope: "",
  participants: ""
};

const emptyConductForm = {
  scheduledDrillId: "",
  actualDate: "",
  actualTime: "",
  alarmToEvacuationTime: "",
  totalEvacuationTime: "",
  observations: "",
  followUpIssues: "",
  photos: []
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const getTodayInputValue = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentTimeInputValue = () => {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
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
  if (!value) return "";
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) return text;

  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatTimeRange = (drill) => {
  const start = formatTime(drill.drillTime);
  const end = formatTime(drill.drillEndTime);
  if (start && end) return `${start} - ${end}`;
  return start || "Time TBC";
};

const getDateParts = (value) => {
  const date = toDate(value);
  if (!date) {
    return {
      day: "--",
      monthYear: "Date TBC",
      weekday: ""
    };
  }

  return {
    day: String(date.getDate()).padStart(2, "0"),
    monthYear: date.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    }),
    weekday: date.toLocaleDateString(undefined, { weekday: "short" })
  };
};

const getStatusStyle = (status) => {
  const normalized = normalizeText(status);

  if (["scheduled", "pending"].includes(normalized)) {
    return { color: "#2563eb", background: "#dbeafe", border: "#93c5fd" };
  }

  if (["completed", "conducted", "pass", "passed"].includes(normalized)) {
    return { color: "#047857", background: "#ecfdf5", border: "#6ee7b7" };
  }

  if (["review", "failed", "fail"].includes(normalized)) {
    return { color: "#b45309", background: "#fef3c7", border: "#fcd34d" };
  }

  return { color: "#475569", background: "#f1f5f9", border: "#cbd5e1" };
};

const getBuildingName = (building) =>
  building?.buildingName || building?.name || building?.building || "";

const getFsmLookupIds = (user) => [
  user?.uid,
  user?.authUid,
  user?.profileId,
  user?.id,
  user?.userId,
  user?.fsmId,
  user?.assignedFsmId,
  user?.staffId,
  user?.employeeId,
  user?.accountId,
  user?.firestoreId
];

const getPrimaryFsmId = (user) =>
  getFsmLookupIds(user).map((value) => String(value || "").trim()).find(Boolean) || "";

const isCompletedDrill = (drill) => {
  const status = normalizeText(drill.status);
  return (
    ["completed", "conducted", "done", "submitted"].includes(status) ||
    Boolean(drill.completedAt || drill.actualDate || drill.conductedDate)
  );
};

const isSameCalendarDay = (firstValue, secondValue) => {
  const firstDate = toDate(firstValue);
  const secondDate = toDate(secondValue);
  if (!firstDate || !secondDate) return false;

  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
};

const isDrillAvailableToConduct = (drill, todayEnd) => {
  const drillDate = toDate(drill.drillDate);
  return !isCompletedDrill(drill) && Boolean(drillDate) && drillDate <= todayEnd;
};

const normalizeDrill = (drill, buildingMap) => {
  const building = buildingMap.get(drill.buildingId);
  const status = drill.status || (drill.performanceStatus ? "Completed" : "Scheduled");

  return {
    ...drill,
    buildingName: drill.buildingName || getBuildingName(building) || "Building TBC",
    drillType: drill.drillType || drill.task || drill.type || "Fire Drill",
    scope: drill.scope || drill.location || "Scope TBC",
    participants: drill.participants || drill.occupants || "Participants TBC",
    status
  };
};

const createConductFormFromDrill = (drill) => ({
  ...emptyConductForm,
  scheduledDrillId: drill?.id || "",
  actualDate: getTodayInputValue(),
  actualTime: getCurrentTimeInputValue()
});

const ScheduleItem = ({ drill }) => {
  const dateParts = getDateParts(drill.drillDate);
  const statusStyle = getStatusStyle(drill.status);

  return (
    <div className="fire-drill-schedule-item">
      <div className="fire-drill-date-badge">
        <strong>{dateParts.day}</strong>
        <span>{dateParts.monthYear}</span>
        <span>{dateParts.weekday}</span>
      </div>
      <div className="fire-drill-item-details">
        <h3>{drill.drillType}</h3>
        <p>{formatTimeRange(drill)}</p>
        <p>{drill.buildingName}</p>
        <p>{drill.scope}</p>
        <p>{drill.participants}</p>
      </div>
      <span
        className="fire-drill-status-badge"
        style={{
          color: statusStyle.color,
          backgroundColor: statusStyle.background,
          borderColor: statusStyle.border
        }}
      >
        {drill.status}
      </span>
    </div>
  );
};

const ScheduleForm = ({
  buildings,
  form,
  formError,
  saving,
  onChange,
  onCancel,
  onSubmit
}) => (
  <section className="dashboard-card fire-drill-form-card">
    <div className="card-header-row">
      <h2 className="section-title">Add Schedule</h2>
      <button type="button" className="view-all-link" onClick={onCancel}>
        Close
      </button>
    </div>
    <form onSubmit={onSubmit}>
      <div className="fire-drill-form-grid">
        {buildings.length > 0 ? (
          <label className="fire-drill-form-field">
            <span>Building</span>
            <select
              value={form.buildingId}
              onChange={(event) => onChange("buildingId", event.target.value)}
              required
            >
              <option value="">Select building</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {getBuildingName(building)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="fire-drill-form-field">
            <span>Building</span>
            <input
              type="text"
              value={form.buildingName}
              onChange={(event) => onChange("buildingName", event.target.value)}
              required
            />
          </label>
        )}
        <label className="fire-drill-form-field">
          <span>Drill Type</span>
          <input
            type="text"
            value={form.drillType}
            onChange={(event) => onChange("drillType", event.target.value)}
            required
          />
        </label>
        <label className="fire-drill-form-field">
          <span>Date</span>
          <input
            type="date"
            value={form.drillDate}
            onChange={(event) => onChange("drillDate", event.target.value)}
            required
          />
        </label>
        <label className="fire-drill-form-field">
          <span>Start Time</span>
          <input
            type="time"
            value={form.drillTime}
            onChange={(event) => onChange("drillTime", event.target.value)}
          />
        </label>
        <label className="fire-drill-form-field">
          <span>End Time</span>
          <input
            type="time"
            value={form.drillEndTime}
            onChange={(event) => onChange("drillEndTime", event.target.value)}
          />
        </label>
        <label className="fire-drill-form-field">
          <span>Scope</span>
          <input
            type="text"
            value={form.scope}
            onChange={(event) => onChange("scope", event.target.value)}
          />
        </label>
        <label className="fire-drill-form-field">
          <span>Participants</span>
          <input
            type="text"
            value={form.participants}
            onChange={(event) => onChange("participants", event.target.value)}
          />
        </label>
      </div>
      {formError && <p className="fire-drill-form-error">{formError}</p>}
      <div className="fire-drill-form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Saving..." : "Save Schedule"}
        </button>
      </div>
    </form>
  </section>
);

const ReadOnlyItem = ({ label, value }) => (
  <div>
    <span>{label}</span>
    <strong>{value || "-"}</strong>
  </div>
);

const ConductForm = ({
  form,
  formError,
  saving,
  selectedDrill,
  availableDrills,
  onChange,
  onCancel,
  onSubmit
}) => (
  <section className="dashboard-card fire-drill-form-card conduct-drill-card">
    <div className="card-header-row">
      <h2 className="section-title">Conduct Drill</h2>
      <button type="button" className="view-all-link" onClick={onCancel}>
        Close
      </button>
    </div>
    <form onSubmit={onSubmit}>
      {availableDrills.length > 1 && (
        <label className="fire-drill-form-field">
          <span>Available Drill</span>
          <select
            value={form.scheduledDrillId}
            onChange={(event) => onChange("scheduledDrillId", event.target.value)}
            required
          >
            {availableDrills.map((drill) => (
              <option key={drill.id} value={drill.id}>
                {drill.drillType} - {formatDate(drill.drillDate)} - {drill.buildingName}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="conduct-drill-summary">
        <ReadOnlyItem label="Building" value={selectedDrill?.buildingName} />
        <ReadOnlyItem label="Scheduled Date" value={formatDate(selectedDrill?.drillDate)} />
        <ReadOnlyItem label="Scheduled Time" value={formatTimeRange(selectedDrill || {})} />
        <ReadOnlyItem label="Drill Type" value={selectedDrill?.drillType} />
        <ReadOnlyItem label="Scope" value={selectedDrill?.scope} />
        <ReadOnlyItem label="Participants" value={selectedDrill?.participants} />
      </div>

      <div className="conduct-drill-section-title">Actual Information</div>
      <div className="fire-drill-form-grid">
        <label className="fire-drill-form-field">
          <span>Actual Date</span>
          <input
            type="date"
            value={form.actualDate}
            onChange={(event) => onChange("actualDate", event.target.value)}
            required
          />
        </label>
        <label className="fire-drill-form-field">
          <span>Actual Time</span>
          <input
            type="time"
            value={form.actualTime}
            onChange={(event) => onChange("actualTime", event.target.value)}
            required
          />
        </label>
      </div>

      <div className="conduct-drill-section-title">Evacuation Timing</div>
      <div className="fire-drill-form-grid">
        <label className="fire-drill-form-field fire-drill-form-field--wide">
          <span>Alarm to Evacuation (mm:ss)</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="02:15"
            value={form.alarmToEvacuationTime}
            onChange={(event) => onChange("alarmToEvacuationTime", event.target.value)}
          />
        </label>
        <label className="fire-drill-form-field fire-drill-form-field--wide">
          <span>Total Evacuation Time (mm:ss)</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="04:32"
            value={form.totalEvacuationTime}
            onChange={(event) => onChange("totalEvacuationTime", event.target.value)}
          />
        </label>
      </div>

      <label className="fire-drill-form-field">
        <span>Observations</span>
        <textarea
          rows={3}
          value={form.observations}
          onChange={(event) => onChange("observations", event.target.value)}
        />
      </label>

      <label className="fire-drill-form-field">
        <span>Follow Up / Issues Identified</span>
        <textarea
          rows={3}
          value={form.followUpIssues}
          onChange={(event) => onChange("followUpIssues", event.target.value)}
        />
      </label>

      <label className="conduct-photo-upload">
        <span>Photos (Optional)</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => onChange("photos", Array.from(event.target.files || []))}
        />
        <strong>Upload Photos</strong>
        <small>
          {form.photos.length > 0
            ? `${form.photos.length} photo${form.photos.length === 1 ? "" : "s"} selected`
            : "Add photos or attach from gallery"}
        </small>
      </label>

      {formError && <p className="fire-drill-form-error">{formError}</p>}
      <div className="fire-drill-form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Saving..." : "Save Conducted Drill"}
        </button>
      </div>
    </form>
  </section>
);

const FireDrill = () => {
  const { user } = useAuthContext();
  const {
    loading,
    error,
    buildings,
    fireDrills
  } = useFsmDashboardData(getFsmLookupIds(user));
  const [activeForm, setActiveForm] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
  const [conductForm, setConductForm] = useState(emptyConductForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAllSchedule, setShowAllSchedule] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const buildingMap = useMemo(
    () => new Map(buildings.map((building) => [building.id, building])),
    [buildings]
  );

  const drillRecords = useMemo(
    () => fireDrills.map((drill) => normalizeDrill(drill, buildingMap)),
    [buildingMap, fireDrills]
  );

  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const todayEnd = useMemo(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }, []);

  const scheduledDrills = useMemo(
    () =>
      drillRecords
        .filter((drill) => !isCompletedDrill(drill))
        .sort((first, second) => {
          const firstDate = toDate(first.drillDate);
          const secondDate = toDate(second.drillDate);
          return (firstDate?.getTime() || Number.MAX_SAFE_INTEGER) - (secondDate?.getTime() || Number.MAX_SAFE_INTEGER);
        }),
    [drillRecords]
  );

  const availableDrills = useMemo(
    () =>
      scheduledDrills.filter((drill) => isDrillAvailableToConduct(drill, todayEnd)),
    [scheduledDrills, todayEnd]
  );

  const drillHistory = useMemo(
    () =>
      drillRecords
        .filter((drill) => isCompletedDrill(drill))
        .sort((first, second) => {
          const firstDate = toDate(first.actualDate || first.conductedDate || first.drillDate);
          const secondDate = toDate(second.actualDate || second.conductedDate || second.drillDate);
          return (secondDate?.getTime() || 0) - (firstDate?.getTime() || 0);
        }),
    [drillRecords]
  );

  const selectedConductDrill = useMemo(
    () =>
      availableDrills.find((drill) => drill.id === conductForm.scheduledDrillId) ||
      null,
    [availableDrills, conductForm.scheduledDrillId]
  );

  const visibleScheduledDrills = showAllSchedule ? scheduledDrills : scheduledDrills.slice(0, 3);
  const visibleHistory = showAllHistory ? drillHistory : drillHistory.slice(0, 5);

  const closeForm = () => {
    setActiveForm(null);
    setFormError("");
  };

  const openConductForm = () => {
    const todaysDrill =
      availableDrills.find((drill) => isSameCalendarDay(drill.drillDate, todayStart)) ||
      availableDrills[0];

    if (!todaysDrill) {
      setActiveForm(null);
      setFormError("There is no scheduled drill available to conduct.");
      return;
    }

    setFormError("");
    setConductForm(createConductFormFromDrill(todaysDrill));
    setActiveForm("conduct");
  };

  const handleScheduleChange = (field, value) => {
    setScheduleForm((current) => ({ ...current, [field]: value }));
  };

  const handleConductChange = (field, value) => {
    if (field === "scheduledDrillId") {
      const selectedDrill = availableDrills.find((drill) => drill.id === value);
      setConductForm(createConductFormFromDrill(selectedDrill));
      return;
    }

    setConductForm((current) => ({ ...current, [field]: value }));
  };

  const getSelectedBuildingName = (buildingId, fallbackName) =>
    getBuildingName(buildingMap.get(buildingId)) || fallbackName;

  const handleScheduleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const buildingName = getSelectedBuildingName(scheduleForm.buildingId, scheduleForm.buildingName);
    if (!buildingName || !scheduleForm.drillDate || !scheduleForm.drillType.trim()) {
      setFormError("Building, drill type, and date are required.");
      return;
    }

    try {
      setSaving(true);
      await createFireDrill({
        ...scheduleForm,
        buildingName,
        fsmId: getPrimaryFsmId(user),
        status: "Scheduled"
      });
      setScheduleForm(emptyScheduleForm);
      closeForm();
    } catch (submitError) {
      setFormError(submitError.message || "Could not save schedule.");
    } finally {
      setSaving(false);
    }
  };

  const handleConductSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const selectedDrill = availableDrills.find((drill) => drill.id === conductForm.scheduledDrillId);

    if (!selectedDrill) {
      setFormError("Select an available scheduled drill before conducting it.");
      return;
    }

    if (!conductForm.actualDate || !conductForm.actualTime) {
      setFormError("Actual date and actual time are required.");
      return;
    }

    try {
      setSaving(true);
      const uploadedPhotos = conductForm.photos.length > 0
        ? await Promise.all(
          conductForm.photos.map((file) =>
            uploadFile(file, `fire-drills/${selectedDrill.id}`)
          )
        )
        : [];

      await completeFireDrill(selectedDrill.id, {
        actualDate: conductForm.actualDate,
        actualTime: conductForm.actualTime,
        alarmToEvacuationTime: conductForm.alarmToEvacuationTime,
        totalEvacuationTime: conductForm.totalEvacuationTime,
        observations: conductForm.observations,
        followUpIssues: conductForm.followUpIssues,
        photos: uploadedPhotos,
        photoUrls: uploadedPhotos.map((photo) => photo.url)
      });

      setConductForm(emptyConductForm);
      closeForm();
    } catch (submitError) {
      setFormError(submitError.message || "Could not save conducted drill.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container fire-drill-page">
      {error && <div className="error-state">{error}</div>}
      {loading && <div className="loading-state">Loading fire drill records...</div>}
      {formError && !activeForm && <div className="error-state">{formError}</div>}

      <div className="fire-drill-page-header">
        <div>
          <h1>Fire Drill</h1>
          <p>Schedule upcoming drills and record completed drill outcomes.</p>
        </div>
        <div className="fire-drill-action-buttons">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setFormError("");
              setActiveForm(activeForm === "schedule" ? null : "schedule");
            }}
          >
            Add Schedule
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={openConductForm}
            disabled={availableDrills.length === 0}
            title={availableDrills.length === 0 ? "No scheduled drill is available to conduct." : undefined}
          >
            Conduct Drill
          </button>
        </div>
      </div>

      {activeForm === "schedule" && (
        <ScheduleForm
          buildings={buildings}
          form={scheduleForm}
          formError={formError}
          saving={saving}
          onChange={handleScheduleChange}
          onCancel={closeForm}
          onSubmit={handleScheduleSubmit}
        />
      )}

      {activeForm === "conduct" && selectedConductDrill && (
        <ConductForm
          form={conductForm}
          formError={formError}
          saving={saving}
          selectedDrill={selectedConductDrill}
          availableDrills={availableDrills}
          onChange={handleConductChange}
          onCancel={closeForm}
          onSubmit={handleConductSubmit}
        />
      )}

      <section className="dashboard-card fire-drill-card">
        <div className="card-header-row">
          <h2 className="section-title">Schedule</h2>
          {scheduledDrills.length > 3 && (
            <button
              type="button"
              className="view-all-link"
              onClick={() => setShowAllSchedule((current) => !current)}
            >
              {showAllSchedule ? "Show Less" : "View All"}
            </button>
          )}
        </div>
        {visibleScheduledDrills.length > 0 ? (
          <div className="fire-drill-schedule-list">
            {visibleScheduledDrills.map((drill) => (
              <ScheduleItem key={drill.id} drill={drill} />
            ))}
          </div>
        ) : (
          <div className="fire-drill-empty-card-space" />
        )}
      </section>

      <section className="dashboard-card fire-drill-card">
        <div className="card-header-row">
          <h2 className="section-title">Drill History</h2>
          {drillHistory.length > 5 && (
            <button
              type="button"
              className="view-all-link"
              onClick={() => setShowAllHistory((current) => !current)}
            >
              {showAllHistory ? "Show Less" : "View All"}
            </button>
          )}
        </div>
        {visibleHistory.length > 0 ? (
          <div className="fire-drill-history-table-wrapper">
            <table className="dashboard-table fire-drill-history-table">
              <thead>
                <tr>
                  <th>DRILL ID</th>
                  <th>TYPE</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((drill) => {
                  const historyStatus = drill.performanceStatus || drill.status;
                  const statusStyle = getStatusStyle(historyStatus);

                  return (
                    <tr key={drill.id}>
                      <td className="id-cell">{drill.id}</td>
                      <td>{drill.drillType}</td>
                      <td>{formatDate(drill.actualDate || drill.conductedDate || drill.drillDate)}</td>
                      <td>
                        <span
                          className="fire-drill-status-badge"
                          style={{
                            color: statusStyle.color,
                            backgroundColor: statusStyle.background,
                            borderColor: statusStyle.border
                          }}
                        >
                          {historyStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="fire-drill-empty-card-space" />
        )}
      </section>
    </div>
  );
};

export default FireDrill;
