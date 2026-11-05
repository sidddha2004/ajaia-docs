import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  detectKind,
  htmlToDoc,
  ImportError,
  importFile,
  MAX_IMPORT_BYTES,
  textToHtml,
  titleFromFilename,
} from "@/lib/import";

type Node = { type: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string }[]; content?: Node[] };

const file = (name: string, text: string) => {
  const bytes = Buffer.from(text, "utf8");
  return { name, size: bytes.length, bytes };
};

/** Flatten a TipTap doc into node types (depth-first), for easy assertions. */
const types = (n: Node): string[] => [n.type, ...(n.content ?? []).flatMap(types)];
const text = (n: Node): string => n.text ?? (n.content ?? []).map(text).join("");

describe("detectKind / titleFromFilename", () => {
  it("recognises supported extensions case-insensitively", () => {
    expect(detectKind("a.TXT")).toBe("txt");
    expect(detectKind("notes.md")).toBe("md");
    expect(detectKind("notes.markdown")).toBe("md");
    expect(detectKind("Brief.DOCX")).toBe("docx");
  });

  it("rejects everything else", () => {
    for (const name of ["a.pdf", "a.doc", "a.html", "a", "a.txt.exe"]) expect(detectKind(name)).toBeNull();
  });

  it("derives a title from the filename", () => {
    expect(titleFromFilename("Q3 Plan.docx")).toBe("Q3 Plan");
    expect(titleFromFilename("C:\\fakepath\\notes.md")).toBe("notes");
    expect(titleFromFilename(".md")).toBe("Imported document");
    expect(titleFromFilename(`${"x".repeat(300)}.txt`)).toHaveLength(200);
  });
});

describe("plain text", () => {
  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    expect(textToHtml("one\r\ntwo\n\n\nthree")).toBe("<p>one<br>two</p><p>three</p>");
  });

  it("escapes HTML so it shows as literal text", () => {
    expect(textToHtml("<b>hi</b> & bye")).toBe("<p>&lt;b&gt;hi&lt;/b&gt; &amp; bye</p>");
  });

  it("imports .txt into paragraphs with hard breaks", async () => {
    const { title, content } = await importFile(file("todo.txt", "Buy milk\nBuy eggs\n\n<script>x</script>"));
    expect(title).toBe("todo");
    expect(types(content as Node)).toEqual(["doc", "paragraph", "text", "hardBreak", "text", "paragraph", "text"]);
    expect(text(content as Node)).toContain("<script>x</script>"); // literal text, not markup
  });
});

describe("markdown", () => {
  it("keeps headings, marks and both list types", async () => {
    const md = "# Title\n\nSome **bold** and *italic*.\n\n## Sub\n\n- a\n- b\n\n1. one\n2. two\n";
    const { content } = await importFile(file("notes.md", md));
    const doc = content as Node;
    const blocks = doc.content!.map((n) => (n.type === "heading" ? `h${n.attrs!.level}` : n.type));
    expect(blocks).toEqual(["h1", "paragraph", "h2", "bulletList", "orderedList"]);
    const marks = doc.content![1].content!.flatMap((n) => n.marks?.map((m) => m.type) ?? []);
    expect(marks).toEqual(["bold", "italic"]);
  });
});

describe("docx", () => {
  it("imports the sample .docx with headings, underline and lists", async () => {
    const bytes = readFileSync("samples/product-brief.docx");
    const { title, content } = await importFile({ name: "product-brief.docx", size: bytes.length, bytes });
    expect(title).toBe("product-brief");
    const all = types(content as Node);
    expect(all).toEqual(expect.arrayContaining(["heading", "bulletList", "orderedList"]));
    expect(JSON.stringify(content)).toContain('"underline"');
  });

  it("rejects a file that isn't really a .docx", async () => {
    await expect(importFile(file("fake.docx", "%PDF-1.4"))).rejects.toMatchObject({ status: 422 });
  });
});

describe("sanitising", () => {
  it("drops scripts, event handlers and nodes outside the editor schema", () => {
    const doc = htmlToDoc(
      `<p onclick="alert(1)">ok</p><script>alert(2)</script><img src=x onerror=alert(3)><iframe src="//evil"></iframe><a href="javascript:alert(4)">click me</a>`,
    );
    const json = JSON.stringify(doc);
    expect(json).not.toMatch(/alert|onclick|onerror|script|iframe|javascript:|image|href|"marks"/i);
    // The anchor's text survives as plain text; the link itself does not.
    expect(text(doc as Node)).toBe("okclick me");
  });

  it("returns an empty paragraph rather than an empty doc", () => {
    expect(htmlToDoc("<script>x</script>")).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
});

describe("rejections", () => {
  it("rejects unsupported types with 415 and lists what is supported", async () => {
    const err = await importFile(file("report.pdf", "%PDF")).catch((e) => e);
    expect(err).toBeInstanceOf(ImportError);
    expect(err.status).toBe(415);
    expect(err.message).toMatch(/\.txt.*\.md.*\.docx/);
  });

  it("rejects empty, oversized and binary files", async () => {
    await expect(importFile(file("e.txt", ""))).rejects.toMatchObject({ status: 400 });
    await expect(
      importFile({ name: "big.txt", size: MAX_IMPORT_BYTES + 1, bytes: Buffer.alloc(1) }),
    ).rejects.toMatchObject({ status: 413 });
    await expect(importFile({ name: "bin.txt", size: 3, bytes: Buffer.from([97, 0, 98]) })).rejects.toMatchObject({
      status: 422,
    });
  });
});
