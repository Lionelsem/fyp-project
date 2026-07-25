import React from "react";

const ResponsiveTableRegion = ({ label, className = "", children }) => {
  const classes = ["responsive-table-region", className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
};

export default ResponsiveTableRegion;
