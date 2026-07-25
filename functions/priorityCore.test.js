const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAssessmentInput,
  buildPriorityDecision,
  getRoleAccessError,
  hashAssessmentInput,
  isResolvedStatus,
  parseVertexPriorityResponse,
  validateDraft,
  validatePhotoPath,
  validatePolicy,
  withTransientRetry,
  withTimeout
} = require("./priorityCore");

const vertexResult = (suggestedPriority) => ({
  response: {
    candidates: [{
      content: {
        parts: [{ text: JSON.stringify({ suggestedPriority }) }]
      }
    }]
  }
});

test("accepts mocked Low, Medium, and High structured Vertex responses", () => {
  for (const priority of ["Low", "Medium", "High"]) {
    assert.equal(parseVertexPriorityResponse(vertexResult(priority)), priority);
    assert.equal(
      parseVertexPriorityResponse({
        text: JSON.stringify({ suggestedPriority: priority })
      }),
      priority
    );
  }
});

test("allows only FSM users to assess issues and manage the priority policy", () => {
  assert.equal(
    getRoleAccessError({ uid: "", role: "", requiredRole: "FSM" }),
    "unauthenticated"
  );
  assert.equal(
    getRoleAccessError({ uid: "customer-1", role: "Customer", requiredRole: "FSM" }),
    "permission-denied"
  );
  assert.equal(
    getRoleAccessError({ uid: "admin-1", role: "Admin", requiredRole: "FSM" }),
    "permission-denied"
  );
  assert.equal(
    getRoleAccessError({ uid: "fsm-1", role: "FSM", requiredRole: "FSM" }),
    ""
  );
});

test("rejects malformed and out-of-schema model responses", () => {
  assert.throws(
    () => parseVertexPriorityResponse({
      response: { candidates: [{ content: { parts: [{ text: "not-json" }] } }] }
    }),
    /valid JSON/
  );
  assert.throws(
    () => parseVertexPriorityResponse(vertexResult("Critical")),
    /unsupported priority/
  );
});

test("records both accepted suggestions and manual FSM overrides", () => {
  assert.deepEqual(buildPriorityDecision("High", "High"), {
    suggestedPriority: "High",
    finalPriority: "High",
    accepted: true
  });
  assert.deepEqual(buildPriorityDecision("High", "Medium"), {
    suggestedPriority: "High",
    finalPriority: "Medium",
    accepted: false
  });
});

test("validates text-only unresolved drafts and rejects closed drafts", () => {
  const draft = validateDraft({
    inspectionKey: "inspection-1",
    buildingId: "building-1",
    itemLabel: "Fire door",
    issueDescription: "Door does not close",
    status: "Open"
  });
  assert.deepEqual(draft.photoPaths, []);
  assert.equal(isResolvedStatus("Resolved"), true);
  assert.throws(
    () => validateDraft({ ...draft, status: "Closed" }),
    /not assessed/
  );
});

test("validates inspection photo ownership and supported image formats", () => {
  assert.equal(
    validatePhotoPath({
      path: "inspection-defect-photos/inspection-1/fire-door/photo.jpg",
      inspectionKey: "inspection-1",
      contentType: "image/jpeg"
    }),
    true
  );
  assert.throws(
    () => validatePhotoPath({
      path: "inspection-defect-photos/inspection-2/fire-door/photo.jpg",
      inspectionKey: "inspection-1",
      contentType: "image/jpeg"
    }),
    /does not belong/
  );
  assert.throws(
    () => validatePhotoPath({
      path: "inspection-defect-photos/inspection-1/fire-door/photo.gif",
      inspectionKey: "inspection-1",
      contentType: "image/gif"
    }),
    /unsupported/
  );
});

test("policy input hashes change with policy version or material issue inputs", () => {
  const policy = validatePolicy({
    enabled: true,
    definitions: {
      Low: "No immediate safety impact.",
      Medium: "Degraded protection requiring prompt action.",
      High: "Immediate life-safety or critical system impact."
    }
  });
  assert.equal(policy.enabled, true);
  const draft = validateDraft({
    inspectionKey: "inspection-1",
    buildingId: "building-1",
    itemLabel: "Fire alarm",
    issueDescription: "One indicator is not lit",
    status: "Open"
  });
  const base = buildAssessmentInput({
    draft,
    building: { buildingName: "Tower A" },
    policyVersion: 1
  });
  const statusOnly = buildAssessmentInput({
    draft: { ...draft, status: "In Progress" },
    building: { buildingName: "Tower A" },
    policyVersion: 1
  });
  assert.equal(hashAssessmentInput(base), hashAssessmentInput(statusOnly));
  assert.notEqual(
    hashAssessmentInput(base),
    hashAssessmentInput({ ...base, policyVersion: 2 })
  );
  assert.notEqual(
    hashAssessmentInput(base),
    hashAssessmentInput({ ...base, issueDescription: "Panel is offline" })
  );
});

test("times out a stalled model request", async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 5),
    /timed out/
  );
});

test("retries transient Vertex errors once", async () => {
  let attempts = 0;
  const result = await withTransientRetry(
    async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error(
          JSON.stringify({
            error: { code: 500, message: "Internal error encountered." }
          })
        );
      }
      return "High";
    },
    { attempts: 2, delayMs: 0 }
  );

  assert.equal(result, "High");
  assert.equal(attempts, 2);
});
