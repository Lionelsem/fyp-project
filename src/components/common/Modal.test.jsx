import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Modal from "./Modal";

afterEach(() => {
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";
});

const ModalHarness = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open dialog</button>
      {isOpen && (
        <Modal title="Responsive dialog" onClose={() => setIsOpen(false)}>
          <button type="button">First modal action</button>
          <button type="button">Last modal action</button>
        </Modal>
      )}
    </>
  );
};

test("modal closes with Escape and restores focus", async () => {
  render(<ModalHarness />);

  const trigger = screen.getByRole("button", { name: "Open dialog" });
  trigger.focus();
  fireEvent.click(trigger);

  expect(screen.getByRole("dialog", { name: "Responsive dialog" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
  expect(document.body.style.overflow).toBe("hidden");

  fireEvent.keyDown(document, { key: "Escape" });

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });
});

test("modal closes only when the backdrop itself is clicked", () => {
  const onClose = jest.fn();
  render(
    <Modal title="Backdrop dialog" onClose={onClose}>
      <button type="button">Dialog action</button>
    </Modal>
  );

  fireEvent.click(screen.getByRole("dialog"));
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.click(document.querySelector(".modal-backdrop"));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("renders at document level and marks the background as modal", () => {
  const { container } = render(
    <div data-testid="render-container">
      <Modal title="Portaled dialog" onClose={() => {}}>Content</Modal>
    </div>
  );

  expect(container.querySelector(".modal-backdrop")).toBeNull();
  expect(document.body.querySelector(".modal-backdrop")).toBeInTheDocument();
  expect(document.body).toHaveClass("modal-open");
});
