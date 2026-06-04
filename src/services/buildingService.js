import * as fs from "./firestoreService";

export const createBuilding = async (data) => {
  const docRef = await fs.addBuilding(data);
  return { id: docRef.id, ...data };
};

export const createFloor = async (data) => {
  const docRef = await fs.addFloor(data);
  return { id: docRef.id, ...data };
};

export const createEquipment = async (data) => {
  const docRef = await fs.addEquipment(data);
  return { id: docRef.id, ...data };
};
