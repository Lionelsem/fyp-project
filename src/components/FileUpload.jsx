import React, { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const FileUpload = ({ buildingId, reportId, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedIsImage, setUploadedIsImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Store the selected file locally until the user clicks Upload.
  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setError("");
    setUploadProgress(0);
    setUploadedFile(null);
    setUploadedIsImage(false);
  };

  const handleUpload = () => {
    // Prevent upload if the user has not selected a file.
    if (!file) {
      setError("Please select a file before uploading.");
      return;
    }

    if (!buildingId || !reportId) {
      setError("Building ID and report ID are required before uploading.");
      return;
    }

    setError("");
    setIsUploading(true);
    setUploadProgress(0);

    // Firebase Storage path for inspection report uploads.
    const filePath = `inspectionReports/${buildingId}/${reportId}/${Date.now()}-${file.name}`;
    const fileRef = ref(storage, filePath);

    // uploadBytesResumable lets us listen to upload progress updates.
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Calculate and display upload progress as a percentage.
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setUploadProgress(progress);
      },
      (uploadError) => {
        // Handle upload failure.
        setError(uploadError.message || "File upload failed.");
        setIsUploading(false);
      },
      async () => {
        try {
          // Retrieve the public download URL after upload completes.
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const fileData = {
            fileName: file.name,
            filePath: filePath,
            downloadURL: downloadURL,
            uploadedAt: new Date()
          };

          setUploadedFile(fileData);
          setUploadedIsImage(file.type.startsWith("image/"));
          setIsUploading(false);

          // Return the uploaded file data to the parent component if needed.
          if (typeof onUploadComplete === "function") {
            onUploadComplete(fileData);
          }
        } catch (downloadError) {
          setError(downloadError.message || "Could not get uploaded file URL.");
          setIsUploading(false);
        }
      }
    );
  };

  return (
    <div className="file-upload">
      <input type="file" onChange={handleFileChange} />

      <button type="button" onClick={handleUpload} disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload File"}
      </button>

      {uploadProgress > 0 && (
        <p>Upload progress: {uploadProgress}%</p>
      )}

      {error && (
        <p style={{ color: "red" }}>{error}</p>
      )}

      {uploadedFile && (
        <div>
          <p>
            Uploaded URL:{" "}
            <a href={uploadedFile.downloadURL} target="_blank" rel="noreferrer">
              {uploadedFile.downloadURL}
            </a>
          </p>

          {uploadedIsImage && (
            <img
              src={uploadedFile.downloadURL}
              alt={uploadedFile.fileName}
              style={{ width: "min(100%, 240px)", display: "block" }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
