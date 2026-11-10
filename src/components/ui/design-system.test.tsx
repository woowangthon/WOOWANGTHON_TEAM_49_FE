// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "./text-field";
import { SelectField } from "./select-field";
import { Textarea } from "./textarea";
import { Button, Disclosure } from "./presentation";

describe("T1 shared UI behavior", () => {
 it("preserves refs, external descriptions, hints and error associations", () => {
  const ref = createRef<HTMLInputElement>();
  render(<><p id="external">?? ??</p><TextField ref={ref} id="amount" label="amount" hint="description" error="description" aria-describedby="external" /></>);
  expect(ref.current).toBe(screen.getByLabelText("amount"));
  expect(ref.current).toHaveAttribute("aria-describedby", "external amount-hint amount-error");
  expect(ref.current).toHaveAttribute("aria-invalid", "true");
 });
 it("keeps native select and textarea changes and disabled semantics", async () => {
  const user = userEvent.setup();
  render(<><SelectField id="scope" label="scope" hint="draft text"><option value="a">??</option><option value="b">??</option></SelectField><Textarea id="message" label="message" /><TextField id="locked" label="description" disabled /></>);
  await user.selectOptions(screen.getByLabelText("scope"), "b");
  await user.type(screen.getByLabelText("message"), "description");
  expect(screen.getByLabelText("scope")).toHaveValue("b");
  expect(screen.getByLabelText("message")).toHaveValue("description");
  expect(screen.getByLabelText("description")).toBeDisabled();
 });
 it("prevents duplicate pending actions and preserves explicit form submission", async () => {
  const submit = vi.fn(e => e.preventDefault()); const user = userEvent.setup();
  const { rerender } = render(<form onSubmit={submit}><Button type="submit" pending>??</Button></form>);
  await user.click(screen.getByRole("button")); expect(submit).not.toHaveBeenCalled();
  rerender(<form onSubmit={submit}><Button type="submit">??</Button></form>);
  await user.click(screen.getByRole("button")); expect(submit).toHaveBeenCalledTimes(1);
 });
 it("keeps an edited draft mounted through disclosure toggles", async () => {
  const user = userEvent.setup(); render(<Disclosure summary="Details"><Textarea id="draft" label="Draft" /></Disclosure>);
  await user.click(screen.getByText("Details")); await user.type(screen.getByLabelText("Draft"), "draft text");
  await user.click(screen.getByText("Details")); await user.click(screen.getByText("Details"));
  expect(screen.getByLabelText("Draft")).toHaveValue("draft text");
 });
});
