import React from "react";

const PageLayout = ({ children, className = "" }) => {
  const classes = ["page-layout", className].filter(Boolean).join(" ");

  return <div className={classes}>{children}</div>;
};

export default PageLayout;
