import React from "react";
import { render, screen } from "@testing-library/react";
import ResponsiveTableRegion from "./components/common/ResponsiveTableRegion";

test("renders an accessible responsive table region", () => {
  render(
    <ResponsiveTableRegion label="Example records">
      <table>
        <tbody>
          <tr><td>Example</td></tr>
        </tbody>
      </table>
    </ResponsiveTableRegion>
  );

  expect(screen.getByRole("region", { name: "Example records" })).toBeInTheDocument();
  expect(screen.getByRole("table")).toBeInTheDocument();
});
