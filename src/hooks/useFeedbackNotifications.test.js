import { buildFeedbackNotifications } from "./useFeedbackNotifications";

const lastMessageAt = new Date("2026-07-26T09:30:00+08:00");

test("builds one notification from a thread summary without loading message history", () => {
  const notifications = buildFeedbackNotifications({
    userIds: ["customer-1"],
    threads: [{
      id: "thread-1",
      title: "Inspection question",
      recipient: "Alex Tan",
      lastMessage: "I have checked the report.",
      lastMessageSenderId: "fsm-1",
      lastMessageSenderName: "Alex Tan",
      lastMessageReadBy: ["fsm-1"],
      lastMessageAt
    }]
  });

  expect(notifications).toEqual([
    expect.objectContaining({
      type: "chat",
      title: "New message from Alex Tan",
      message: "Inspection question: I have checked the report.",
      threadId: "thread-1"
    })
  ]);
});

test("does not notify for an own or already-read latest message", () => {
  const source = {
    id: "thread-1",
    lastMessage: "Latest reply",
    lastMessageSenderId: "customer-1",
    lastMessageReadBy: ["customer-1"],
    lastMessageAt
  };

  expect(buildFeedbackNotifications({
    userIds: ["customer-1"],
    threads: [source]
  })).toEqual([]);

  expect(buildFeedbackNotifications({
    userIds: ["customer-1"],
    threads: [{
      ...source,
      lastMessageSenderId: "fsm-1",
      lastMessageReadBy: ["fsm-1", "customer-1"]
    }]
  })).toEqual([]);
});
