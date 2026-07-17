import React from "react";

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4z" />
    <circle cx="12" cy="13.5" r="3.25" />
  </svg>
);

const GalleryIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m5.5 17 4.25-4 3 2.5 2.25-2 3.5 3.5" />
  </svg>
);

const ImageSourcePicker = ({
  onFilesSelected,
  disabled = false,
  multiple = true,
  className = "",
  ariaLabel = "Add photos"
}) => {
  const handleChange = (source) => (event) => {
    const files = event.target.files;
    if (files?.length) {
      onFilesSelected?.(files, source);
    }

    // Allow selecting or taking the same image again after it is removed.
    event.target.value = "";
  };

  const pickerClassName = ["image-source-picker", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={pickerClassName} role="group" aria-label={ariaLabel}>
      <label className={`image-source-option image-source-option--camera${disabled ? " is-disabled" : ""}`}>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={disabled}
          onChange={handleChange("camera")}
        />
        <CameraIcon />
        <span>Camera</span>
      </label>

      <label className={`image-source-option image-source-option--gallery${disabled ? " is-disabled" : ""}`}>
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          disabled={disabled}
          onChange={handleChange("gallery")}
        />
        <GalleryIcon />
        <span>Gallery</span>
      </label>
    </div>
  );
};

export default ImageSourcePicker;
