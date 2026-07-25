import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../config/firebase";

const sanitizePathPart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-") || "file";

let uploadSequence = 0;

export const STORAGE_FOLDERS = {
  INSPECTION_DEFECT_PHOTOS: "inspection-defect-photos",
  PROFILE_PICTURES: "profile-pictures"
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

const normalizeUploadFolder = (folder) => {
  const folderParts = String(folder || "uploads")
    .split("/")
    .map((part) => sanitizePathPart(part).replace(/^-|-$/g, ""))
    .filter(Boolean);

  // Older issue-photo callers used issues/{issueKey}; keep those uploads inside
  // the inspection defect photo area so Storage rules only need one prefix.
  if (folderParts[0] === "issues") {
    return [
      STORAGE_FOLDERS.INSPECTION_DEFECT_PHOTOS,
      "legacy-issues",
      ...folderParts.slice(1)
    ].join("/");
  }

  return folderParts.join("/") || "uploads";
};

export const uploadFile = async (file, folder = "uploads") => {
  const safeFolder = normalizeUploadFolder(folder);
  const safeName = sanitizePathPart(file.name);
  uploadSequence += 1;
  const storagePath = `${safeFolder}/${Date.now()}-${uploadSequence}-${safeName}`;
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

export const deleteUploadedFile = async (url, expectedFolder) => {
  if (!url) return;
  const fileRef = ref(storage, url);
  const safeFolder = normalizeUploadFolder(expectedFolder);
  if (!fileRef.fullPath.startsWith(`${safeFolder}/`)) {
    return;
  }
  try {
    await deleteObject(fileRef);
  } catch (error) {
    if (error?.code !== "storage/object-not-found") throw error;
  }
};
