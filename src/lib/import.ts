import DOMPurify from "isomorphic-dompurify";
import mammoth from "mammoth";
import { marked } from "marked";
import { generateJSON } from "@tiptap/html/server";
import { baseExtensions } from "./editorSchema";
import { EMPTY_DOC, MAX_CONTENT_BYTES } from "./validation";
import { MAX_IMPORT_BYTES, SUPPORTED_EXTENSIONS } from "./importConfig";

export { MAX_IMPORT_BYTES, SUPPORTED_EXTENSIONS };

type Kind = "txt" | "md" | "docx";

export class ImportError extends Error {
  constructor(
    message: string,
    public status: 400 | 413 | 415 | 422 = 400,
  ) {
    super(message);
  }
}

export function detectKind(filename: string): Kind | null {
  const ext = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (ext === "txt") return "txt";
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "docx") return "docx";
  return null;
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "").trim();
  return (base || "Imported document").slice(0, 200);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeText(buf: Buffer): string {
  if (buf.includes(0)) throw new ImportError("That file doesn't look like plain text", 422);
  return buf.toString("utf8").replace(/^﻿/, "");
}

/** Plain text: blank lines separate paragraphs, single newlines become line breaks. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.split("\n").map(escapeHtml).join("<br>")}</p>`)
    .join("");
}

async function toHtml(kind: Kind, buf: Buffer): Promise<string> {
  switch (kind) {
    case "txt":
      return textToHtml(decodeText(buf));
    case "md":
      return marked.parse(decodeText(buf), { async: false, gfm: true });
    case "docx": {
      // .docx is a zip archive; check the signature before handing it to mammoth.
      if (buf.length < 4 || buf.readUInt32LE(0) !== 0x04034b50) {
        throw new ImportError("That .docx file appears to be corrupted", 422);
      }
      try {
        // mammoth drops underline unless it is mapped explicitly.
        const { value } = await mammoth.convertToHtml({ buffer: buf }, { styleMap: ["u => u"] });
        return value;
      } catch {
        throw new ImportError("Couldn't read that .docx file", 422);
      }
    }
  }
}

/** HTML → sanitised → TipTap JSON restricted to the editor's schema. */
export function htmlToDoc(html: string): Record<string, unknown> {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  const doc = generateJSON(clean, baseExtensions) as { type: string; content?: unknown[] };
  return doc.content && doc.content.length > 0 ? doc : EMPTY_DOC;
}

export async function importFile(file: { name: string; size: number; bytes: Buffer }) {
  const kind = detectKind(file.name);
  if (!kind) {
    throw new ImportError(`Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`, 415);
  }
  if (file.size === 0) throw new ImportError("That file is empty", 400);
  if (file.size > MAX_IMPORT_BYTES) throw new ImportError("File is too large (max 2 MB)", 413);

  const content = htmlToDoc(await toHtml(kind, file.bytes));
  if (JSON.stringify(content).length > MAX_CONTENT_BYTES) {
    throw new ImportError("That document is too large to import", 413);
  }
  return { title: titleFromFilename(file.name), content };
}
