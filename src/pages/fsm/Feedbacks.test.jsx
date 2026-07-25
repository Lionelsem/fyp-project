import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Feedbacks from "./Feedbacks";
import { useAuthContext } from "../../context/AuthContext";
import {
  addFeedbackReply,
  deleteFeedbackReply,
  listenToFeedbackThreadReplies,
  listenToFsmFeedbackThreads,
  markFeedbackMessagesAsRead,
  updateFeedbackReply
} from "../../services/feedbackService";

jest.mock("../../context/AuthContext", () => ({
  useAuthContext: jest.fn()
}));

jest.mock("../../services/feedbackService", () => ({
  addFeedbackReply: jest.fn(() => Promise.resolve()),
  deleteFeedbackReply: jest.fn(() => Promise.resolve()),
  listenToFeedbackThreadReplies: jest.fn(),
  listenToFsmFeedbackThreads: jest.fn(),
  markFeedbackMessagesAsRead: jest.fn(() => Promise.resolve()),
  updateFeedbackReply: jest.fn(() => Promise.resolve())
}));

const snapshotDoc = (id, data) => ({ id, data: () => data });

beforeEach(() => {
  jest.clearAllMocks();
  addFeedbackReply.mockResolvedValue();
  deleteFeedbackReply.mockResolvedValue();
  markFeedbackMessagesAsRead.mockResolvedValue();
  updateFeedbackReply.mockResolvedValue();
  useAuthContext.mockReturnValue({
    user: {
      uid: "fsm-auth-1",
      profileId: "fsm-profile-1",
      fullName: "FSM User"
    }
  });
  listenToFsmFeedbackThreads.mockImplementation((_fsmIds, onUpdate) => {
    onUpdate({
      docs: [snapshotDoc("thread-1", {
        title: "Monthly report question",
        customerName: "Customer One",
        building: "North Tower",
        lastMessageAt: new Date("2026-07-21T09:00:00Z")
      })]
    });
    return jest.fn();
  });
  listenToFeedbackThreadReplies.mockImplementation((_threadId, onUpdate) => {
    onUpdate({
      docs: [
        snapshotDoc("message-1", {
          senderName: "Customer One",
          createdBy: "customer-1",
          message: "Can you clarify this item?",
          readBy: ["customer-1"],
          createdAt: new Date("2026-07-21T09:00:00Z")
        }),
        snapshotDoc("message-2", {
          senderName: "FSM User",
          createdBy: "fsm-auth-1",
          message: "I have sent the clarification.",
          readBy: ["fsm-auth-1", "customer-1"],
          createdAt: new Date("2026-07-21T09:05:00Z")
        })
      ]
    });
    return jest.fn();
  });
});

test("lets an FSM read and reply without creating customer conversations", async () => {
  render(<Feedbacks />);

  expect((await screen.findAllByText("Monthly report question")).length).toBeGreaterThan(0);
  expect(screen.getByText("Can you clarify this item?")).toBeInTheDocument();
  expect(screen.getByText("Read")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /new message/i })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Edit your message" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete your message" })).toBeInTheDocument();
  expect(markFeedbackMessagesAsRead).toHaveBeenCalledWith(
    "thread-1",
    expect.any(Array),
    "fsm-auth-1"
  );

  fireEvent.change(screen.getByLabelText("Reply to customer"), {
    target: { value: "I will send the clarification today." }
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  await waitFor(() => {
    expect(addFeedbackReply).toHaveBeenCalledWith("thread-1", {
      senderName: "FSM User",
      role: "FSM",
      createdBy: "fsm-auth-1",
      message: "I will send the clarification today."
    });
  });
});

test("lets an FSM edit and delete only their own sent message", async () => {
  window.confirm = jest.fn(() => true);
  render(<Feedbacks />);

  fireEvent.click(await screen.findByRole("button", { name: "Edit your message" }));
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Updated clarification." }
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() => {
    expect(updateFeedbackReply).toHaveBeenCalledWith("thread-1", "message-2", {
      message: "Updated clarification."
    });
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete your message" }));

  await waitFor(() => {
    expect(deleteFeedbackReply).toHaveBeenCalledWith("thread-1", "message-2");
  });
});
