import { formatDurationInput, isValidDurationInput } from "./durationInput";

test("automatically inserts a colon after two minute digits", () => {
  expect(formatDurationInput("0")).toBe("0");
  expect(formatDurationInput("02")).toBe("02:");
  expect(formatDurationInput("021")).toBe("02:1");
  expect(formatDurationInput("0215")).toBe("02:15");
});

test("accepts pasted formatting and limits the duration to four digits", () => {
  expect(formatDurationInput("02:15")).toBe("02:15");
  expect(formatDurationInput("021599")).toBe("02:15");
  expect(formatDurationInput("ab02cd15")).toBe("02:15");
});

test("allows backspace to move past the generated colon", () => {
  expect(formatDurationInput("02", "02:")).toBe("0");
});

test("validates complete mm:ss values", () => {
  expect(isValidDurationInput("02:15")).toBe(true);
  expect(isValidDurationInput("02:59")).toBe(true);
  expect(isValidDurationInput("02:60")).toBe(false);
  expect(isValidDurationInput("02:")).toBe(false);
});
