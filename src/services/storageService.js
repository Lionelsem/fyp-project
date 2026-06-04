import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../config/firebase";

const sanitizePathPart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-") || "file";

export const uploadFile = async (file, folder = "uploads") => {
  const safeFolder = String(folder || "uploads")
    .split("/")
    .map((part) => sanitizePathPart(part).replace(/^-|-$/g, ""))
    .filter(Boolean)
    .join("/") || "uploads";
  const safeName = sanitizePathPart(file.name);
  const storagePath = `${safeFolder}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(fileRef, file);
  const url = await getDownloadURL(snapshot.ref);

  return {
    name: file.name,
    url,
    path: storagePath,
    size: file.size,
    type: file.type
  };
};
