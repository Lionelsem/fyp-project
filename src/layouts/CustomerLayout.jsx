import React from "react";

const CustomerLayout = ({ children }) => {
  return (
    <div>
      <header>Customer Layout Header</header>
      <main>{children}</main>
    </div>
  );
};

export default CustomerLayout;
