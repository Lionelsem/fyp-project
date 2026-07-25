import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const call = (name) => httpsCallable(functions, name);

export const assessIssuePriority = async (draft) => {
  const response = await call("assessIssuePriority")({ draft });
  return response.data;
};

export const recordIssuePriorityDecision = async ({
  assessmentId,
  issueId,
  finalPriority
}) => {
  const response = await call("recordIssuePriorityDecision")({
    assessmentId,
    issueId,
    finalPriority
  });
  return response.data;
};

export const getIssuePriorityPolicy = async () => {
  const response = await call("getIssuePriorityPolicy")();
  return response.data;
};

export const updateIssuePriorityPolicy = async (policy) => {
  const response = await call("updateIssuePriorityPolicy")({ policy });
  return response.data;
};
