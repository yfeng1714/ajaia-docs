import { describe, expect, it } from "vitest";
import {
  decodeUtf8Text,
  parseTitle,
  textToDoc,
  titleFromFilename,
  validateContent,
} from "../src/lib/content";

describe("document content", () => {
  it("keeps imported text literal, including characters that look like markup", () => {
    const doc = textToDoc("<b>hi</b>\r\n<script>alert(1)</script>\n");
    expect(doc.content?.map((node) => node.content?.[0]?.text ?? "")).toEqual([
      "<b>hi</b>",
      "<script>alert(1)</script>",
      "",
    ]);
    expect(validateContent(doc)).toBeNull();
  });

  it("rejects unsupported formatting and bad titles", () => {
    expect(
      validateContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "x", marks: [{ type: "link" }] }],
          },
        ],
      }),
    ).toMatch(/cannot be saved/i);
    expect(parseTitle("  ")).toMatchObject({ ok: false });
    expect(parseTitle("a".repeat(121))).toMatchObject({ ok: false });
  });

  it("names an imported file from its .txt stem", () => {
    expect(titleFromFilename("folder/Meeting notes.TXT")).toBe("Meeting notes");
    expect(titleFromFilename(".txt")).toBe("Imported document");
  });

  it("rejects binary and invalid text files", () => {
    expect(decodeUtf8Text(Uint8Array.from([65, 0, 66]))).toMatchObject({ ok: false });
    expect(decodeUtf8Text(Uint8Array.from([0xff, 0xfe]))).toMatchObject({ ok: false });
    expect(decodeUtf8Text(new TextEncoder().encode("Hello"))).toEqual({ ok: true, text: "Hello" });
  });
});
