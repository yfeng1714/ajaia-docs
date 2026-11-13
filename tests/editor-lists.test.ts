// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import { expect, it } from "vitest";
import { validateContent } from "../src/lib/content";
import { createEditorExtensions } from "../src/lib/editor-extensions";

function editorWith(list: "bulletList" | "orderedList") {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: createEditorExtensions(),
    content: { type: "doc", content: [{ type: "paragraph" }] },
  });
  editor.chain().focus().toggleList(list, "listItem").insertContent("One").splitListItem("listItem").insertContent("Two").sinkListItem("listItem").run();
  return editor;
}

it("saves a bullet list indented with the editor's Tab command", () => {
  const editor = editorWith("bulletList");
  const content = editor.getJSON();
  expect(validateContent(content)).toBeNull();
  expect(JSON.stringify(content)).toContain('"type":"bulletList"');
  const nested = JSON.stringify(content).split('"type":"bulletList"').length - 1;
  expect(nested).toBeGreaterThan(1);

  editor.chain().focus().liftListItem("listItem").run();
  expect(validateContent(editor.getJSON())).toBeNull();
  editor.destroy();
});

it("saves a numbered list indented and outdented by the editor", () => {
  const editor = editorWith("orderedList");
  const indented = editor.getJSON();
  expect(validateContent(indented)).toBeNull();
  expect(JSON.stringify(indented)).toContain('"type":"orderedList"');

  editor.chain().focus().liftListItem("listItem").run();
  const flat = editor.getJSON();
  expect(validateContent(flat)).toBeNull();
  expect(JSON.stringify(flat).split('"type":"orderedList"').length - 1).toBe(1);
  editor.destroy();
});
