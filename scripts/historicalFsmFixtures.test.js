const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildClosedIssueLifecycle
} = require("./historicalFsmFixtures");

test("historical issue lifecycle closes in the following calendar month", () => {
  const createdAt = new Date(2026, 0, 23, 9, 30);
  const lifecycle = buildClosedIssueLifecycle(createdAt);

  assert.ok(lifecycle.inProgressAt.getTime() > createdAt.getTime());
  assert.equal(lifecycle.resolvedAt.getMonth(), 1);
  assert.ok(lifecycle.closedAt.getTime() > lifecycle.resolvedAt.getTime());
});

test("historical issue lifecycle remains ordered across a year boundary", () => {
  const createdAt = new Date(2026, 11, 31, 9, 30);
  const lifecycle = buildClosedIssueLifecycle(createdAt);

  assert.equal(lifecycle.resolvedAt.getFullYear(), 2027);
  assert.equal(lifecycle.resolvedAt.getMonth(), 0);
  assert.ok(lifecycle.inProgressAt.getTime() < lifecycle.resolvedAt.getTime());
  assert.ok(lifecycle.resolvedAt.getTime() < lifecycle.closedAt.getTime());
});
