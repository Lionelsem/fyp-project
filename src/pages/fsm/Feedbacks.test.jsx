import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Feedbacks from "./Feedbacks";
import { useAuthContext } from "../../context/AuthContext";
import {
  addFeedbackReply,
  listenToFeedbackThreadReplies,
  listenToFsmFeedbackThreads
} from "../../services/feedbackService";

jest.mock("../../context/AuthContext", () => ({
  useAuthContext: jest.fn()
}));

jest.mock("../../services/feedbackService", () => ({
  addFeedbackReply: jest.fn(() => Promise.resolve()),
  listenToFeedbackThreadReplies: jest.fn(),
  listenToFsmFeedbackThreads: jest.fn()
}));

const snapshotDoc = (id, data) => ({ id, data: () => data });

beforeEach(() => {
  jest.clearAllMocks();
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
      docs: [snapshotDoc("message-1", {
        senderName: "Customer One",
        createdBy: "customer-1",
        message: "Can you clarify this item?",
        createdAt: new Date("2026-07-21T09:00:00Z")
      })]
    });
    return jest.fn();
  });
});

test("lets an FSM read and reply without creating customer conversations", async () => {
  render(<Feedbacks />);

  expect((await screen.findAllByText("Monthly report question")).length).toBeGreaterThan(0);
  expect(screen.getByText("Can you clarify this item?")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /new message/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();

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
