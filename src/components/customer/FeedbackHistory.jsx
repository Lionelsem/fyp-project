import React from "react";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value) => {
  const date = toDate(value);
  return date
    ? date.toLocaleString("en-SG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "Date not available";
};

const FeedbackHistory = ({ record, title = "Feedback History" }) => {
  const savedEntries = Array.isArray(record?.customerFeedbackHistory)
    ? record.customerFeedbackHistory
    : [];
  const entries = savedEntries.length
    ? savedEntries
    : String(record?.customerComments || "").trim()
      ? [{
          message: record.customerComments,
          submittedAt: record.customerFeedbackUpdatedAt || record.updatedAt,
          customerName: "Customer"
        }]
      : [];
  const newestFirst = [...entries].sort((a, b) => (toDate(b.submittedAt)?.getTime() || 0) - (toDate(a.submittedAt)?.getTime() || 0));

  return (
    <section aria-label={title} style={{ marginTop: "20px", borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 10px", color: "#1e293b" }}>{title}</h3>
      {newestFirst.length === 0 ? (
        <p style={{ margin: 0, color: "#64748b" }}>No feedback has been saved yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {newestFirst.map((entry, index) => (
            <article key={`${entry.submittedAt?.seconds || entry.submittedAt || "feedback"}-${index}`} style={{ padding: "12px", borderRadius: "10px", background: "#f8fafc" }}>
              <p style={{ margin: 0, color: "#334155", whiteSpace: "pre-wrap" }}>{entry.message}</p>
              <small style={{ display: "block", marginTop: "7px", color: "#64748b" }}>
                {entry.customerName || "Customer"} · {formatDate(entry.submittedAt)}
              </small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default FeedbackHistory;
