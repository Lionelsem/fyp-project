import * as fs from "./firestoreService";

export const getAllBuildings = async () => {
  const snapshot = await fs.getBuildings();
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
};

export const createBuilding = async (data) => {
  const docRef = await fs.addBuilding(data);
  return { id: docRef.id, ...data };
};

export const updateBuilding = async (id, data) => {
  await fs.updateBuilding(id, data);
  return { id, ...data };
};

export const createFloor = async (data) => {
  const docRef = await fs.addFloor(data);
  return { id: docRef.id, ...data };
};

export const createEquipment = async (data) => {
  const docRef = await fs.addEquipment(data);
  return { id: docRef.id, ...data };
};
