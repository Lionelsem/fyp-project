import React, { useEffect, useState } from "react";

const DEFAULT_PROFILE_PICTURES = [
  "/default-profile-avatar.png",
  "/default-profile-avatar-2.png",
  "/default-profile-avatar-3.png",
  "/default-profile-avatar-4.png"
];

const getDefaultProfilePicture = (identity) => {
  const value = String(identity || "user").trim().toLowerCase();
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) & 0x7fffffff;
  }
  return DEFAULT_PROFILE_PICTURES[hash % DEFAULT_PROFILE_PICTURES.length];
};

const UserAvatar = ({ photoURL, name = "User", className = "" }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photoURL, name]);

  const fallbackPicture = getDefaultProfilePicture(name);

  return (
    <img
      className={className}
      src={!failed && photoURL ? photoURL : fallbackPicture}
      alt={`${name}'s profile`}
      onError={() => setFailed(true)}
    />
  );
};

export default UserAvatar;
