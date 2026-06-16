import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../config/firebase";

const sanitizePathPart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-") || "file";

export const STORAGE_FOLDERS = {
  INSPECTION_DEFECT_PHOTOS: "inspection-defect-photos"
};

export const getInspectionDefectPhotoFolder = ({
  inspectionKey,
  categoryId,
  itemId
}) =>
  [
    STORAGE_FOLDERS.INSPECTION_DEFECT_PHOTOS,
    inspectionKey,
    categoryId,
    itemId
  ]
    .filter(Boolean)
    .join("/");

export const uploadFile = async (file, folder = "uploads") => {
  const safeFolder = String(folder || "uploads")
    .split("/")
    .map((part) => sanitizePathPart(part).replace(/^-|-$/g, ""))
    .filter(Boolean)
    .join("/") || "uploads";
  const safeName = sanitizePathPart(file.name);
  const storagePath = `${safeFolder}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, storagePath);

  console.log("Uploading file to Firebase Storage", {
    storagePath,
    projectId: storage.app.options.projectId,
    storageBucket: storage.app.options.storageBucket,
    fileName: file.name,
    size: file.size,
    type: file.type
  });

  let snapshot;
  let url;
  try {
    snapshot = await uploadBytes(fileRef, file);
    url = await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Firebase Storage upload failed", {
      storagePath,
      projectId: storage.app.options.projectId,
      storageBucket: storage.app.options.storageBucket,
      code: error.code,
      message: error.message
    });
    throw error;
  }

  console.log("Uploaded file to Firebase Storage", {
    storagePath,
    url
  });

  return {
    name: file.name,
    url,
    path: storagePath,
    size: file.size,
    type: file.type
  };
};
