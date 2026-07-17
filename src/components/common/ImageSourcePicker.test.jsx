import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ImageSourcePicker from "./ImageSourcePicker";

test("provides separate camera and gallery inputs", () => {
  const onFilesSelected = jest.fn();
  const { container } = render(
    <ImageSourcePicker onFilesSelected={onFilesSelected} />
  );

  const inputs = container.querySelectorAll('input[type="file"]');
  expect(inputs).toHaveLength(2);
  expect(inputs[0]).toHaveAttribute("capture", "environment");
  expect(inputs[0]).not.toHaveAttribute("multiple");
  expect(inputs[1]).not.toHaveAttribute("capture");
  expect(inputs[1]).toHaveAttribute("multiple");

  const photo = new File(["photo"], "inspection.jpg", { type: "image/jpeg" });
  fireEvent.change(inputs[0], { target: { files: [photo] } });

  expect(onFilesSelected).toHaveBeenCalledWith(
    expect.objectContaining({ 0: photo, length: 1 }),
    "camera"
  );
  expect(screen.getByText("Camera")).toBeInTheDocument();
  expect(screen.getByText("Gallery")).toBeInTheDocument();
});

test("disables both image sources", () => {
  const { container } = render(<ImageSourcePicker disabled />);
  const inputs = container.querySelectorAll('input[type="file"]');

  expect(inputs[0]).toBeDisabled();
  expect(inputs[1]).toBeDisabled();
});
