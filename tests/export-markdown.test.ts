// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadTextFile } from "../src/lib/client/download-text";
import { emptyDoc, type EditorDoc } from "../src/lib/content";
import { documentToMarkdown, markdownFilename } from "../src/lib/export-markdown";

const rich: EditorDoc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Café" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "text", text: " " },
        { type: "text", text: "italic", marks: [{ type: "italic" }] },
        { type: "text", text: " " },
        { type: "text", text: "both", marks: [{ type: "bold" }, { type: "italic" }] },
        { type: "text", text: " " },
        { type: "text", text: "line", marks: [{ type: "underline" }] },
        { type: "text", text: " " },
        { type: "text", text: "all", marks: [{ type: "bold" }, { type: "italic" }, { type: "underline" }] },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Parent" }] },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Child" }] }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "orderedList",
      attrs: { start: 3 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Third" },
                { type: "hardBreak" },
                { type: "text", text: "continued" },
              ],
            },
            {
              type: "orderedList",
              attrs: { start: 10 },
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Nested" }] }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("markdown export", () => {
  it("exports the title, formatting, unicode, and nested lists", () => {
    expect(documentToMarkdown("Café notes", rich)).toBe(`# Café notes

# Café

**bold** *italic* ***both*** <u>line</u> ***<u>all</u>***

- Parent
  - Child

3. Third  
   continued
   10. Nested
`);
  });

  it("escapes literal markup, keeps an empty draft valid, and cleans the filename", () => {
    const markdown = documentToMarkdown("Title * #", {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "* # `code` <script>alert(1)</script> &" }],
        },
      ],
    });
    expect(markdown).toBe(
      "# Title \\* \\#\n\n\\* \\# \\`code\\` &lt;script&gt;alert\\(1\\)&lt;/script&gt; &amp;\n",
    );
    expect(markdown).not.toContain("<script>");
    expect(documentToMarkdown(" \n ", emptyDoc())).toBe("# Untitled document\n");
    expect(markdownFilename(" \n ")).toBe("Untitled document.md");
    expect(markdownFilename("../Quarterly: notes?.txt")).toBe("Quarterly notes .txt.md");
    expect(markdownFilename(`${"a".repeat(120)}.md`)).toBe(`${"a".repeat(80)}.md`);
  });

  it("downloads the text once per click and releases the temporary link", () => {
    const urls: string[] = [];
    const revoked: string[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      expect(blob).toBeInstanceOf(Blob);
      const url = `blob:draft-${urls.length}`;
      urls.push(url);
      return url;
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation((url) => {
      revoked.push(String(url));
    });
    vi.useFakeTimers();
    downloadTextFile("Café notes.md", "# Café notes\n");
    downloadTextFile("Café notes.md", "# Café notes\n");
    expect(document.querySelectorAll("a[download]")).toHaveLength(0);
    expect(urls).toEqual(["blob:draft-0", "blob:draft-1"]);
    expect(revoked).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(revoked).toEqual(urls);
    vi.useRealTimers();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
