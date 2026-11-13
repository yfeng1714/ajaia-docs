import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

export function createEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2] },
      link: false,
      strike: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      trailingNode: false,
    }),
    Placeholder.configure({ placeholder: "Write something worth sharing…" }),
  ];
}
