import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Feedbacks from "./Feedbacks";
import { useAuthContext } from "../../context/AuthContext";
import {
  addFeedbackReply,
  createCustomerFeedbackThread,
  getCustomerFeedbackRecipients,
  listenToCustomerFeedbackThreads,
  listenToFeedbackThreadReplies,
  markFeedbackMessagesAsRead
} from "../../services/feedbackService";

jest.mock("../../context/AuthContext", () => ({
  useAuthContext: jest.fn()
}));

jest.mock("../../services/feedbackService", () => ({
  addFeedbackReply: jest.fn(),
  createCustomerFeedbackThread: jest.fn(),
  deleteCustomerFeedbackThread: jest.fn(),
  deleteFeedbackReply: jest.fn(),
  getCustomerFeedbackRecipients: jest.fn(),
  listenToCustomerFeedbackThreads: jest.fn(),
  listenToFeedbackThreadReplies: jest.fn(),
  markFeedbackMessagesAsRead: jest.fn(),
  updateFeedbackReply: jest.fn()
}));

const snapshotDoc = (id, data) => ({ id, data: () => data });

beforeEach(() => {
  jest.clearAllMocks();
  useAuthContext.mockReturnValue({
    user: {
      uid: "customer-auth-1",
      fullName: "Customer One",
      email: "customer@example.com"
    }
  });
  listenToCustomerFeedbackThreads.mockImplementation((_customerId, onUpdate) => {
    onUpdate({ docs: [] });
    return jest.fn();
  });
  markFeedbackMessagesAsRead.mockResolvedValue(undefined);
  getCustomerFeedbackRecipients.mockResolvedValue([
    {
      key: "fsm-user-1::building-1",
      fsmId: "fsm-user-1",
      fsmName: "Alex Tan",
      buildingId: "building-1",
      buildingName: "North Tower"
    }
  ]);
  createCustomerFeedbackThread.mockResolvedValue({ id: "thread-1" });
  addFeedbackReply.mockResolvedValue({ id: "message-1" });
});

test("creates feedback using the customer's real FSM assignment", async () => {
  render(<Feedbacks />);

  fireEvent.click(screen.getByRole("button", { name: /new message/i }));

  expect(await screen.findByRole("option", { name: "Alex Tan — North Tower" }))
    .toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Subject"), {
    target: { value: "Annual report question" }
  });
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Please clarify the inspection date." }
  });
  fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

  await waitFor(() => {
    expect(createCustomerFeedbackThread).toHaveBeenCalledWith(
      {
        customerId: "customer-auth-1",
        customerName: "Customer One",
        title: "Annual report question",
        recipient: "Alex Tan",
        assignedFsmId: "fsm-user-1",
        issueId: "",
        buildingId: "building-1",
        building: "North Tower",
        participants: ["customer-auth-1", "fsm-user-1"],
        createdBy: "customer-auth-1"
      },
      expect.objectContaining({
        senderName: "Customer One",
        role: "Customer",
        createdBy: "customer-auth-1",
        message: "Please clarify the inspection date.",
        clientId: expect.any(String)
      })
    );
  });
});

test("blocks sending when no FSM assignment exists", async () => {
  getCustomerFeedbackRecipients.mockResolvedValue([]);
  render(<Feedbacks />);

  fireEvent.click(screen.getByRole("button", { name: /new message/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No FSM is assigned to your account or building."
  );
  expect(screen.getByRole("button", { name: "Send Message" })).toBeDisabled();
});

test("shows a reply immediately while Firestore is still saving it", async () => {
  let finishSending;
  addFeedbackReply.mockReturnValue(new Promise((resolve) => {
    finishSending = resolve;
  }));
  listenToCustomerFeedbackThreads.mockImplementation((_customerId, onUpdate) => {
    onUpdate({
      docs: [snapshotDoc("thread-1", {
        title: "Inspection question",
        lastMessageAt: new Date("2026-07-21T09:00:00Z")
      })]
    });
    return jest.fn();
  });
  listenToFeedbackThreadReplies.mockImplementation((_threadId, onUpdate) => {
    onUpdate({ docs: [] });
    return jest.fn();
  });

  render(<Feedbacks />);

  const replyBox = await screen.findByLabelText("Reply message");
  fireEvent.change(replyBox, { target: { value: "Can you check this today?" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(screen.getByText("Can you check this today?")).toBeInTheDocument();
  expect(screen.getAllByText("Sending...").length).toBeGreaterThan(0);
  expect(replyBox).toHaveValue("");

  finishSending({ id: "message-1" });
  await waitFor(() => {
    expect(addFeedbackReply).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({
        message: "Can you check this today?",
        clientId: expect.any(String)
      })
    );
  });
});
