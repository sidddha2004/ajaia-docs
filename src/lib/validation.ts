import { z } from "zod";

export const MAX_CONTENT_BYTES = 1_000_000; // ~1 MB of TipTap JSON

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty")
  .max(200, "Title must be 200 characters or fewer");

type TipTapNode = { type: string; content?: TipTapNode[]; [k: string]: unknown };

const tipTapNode: z.ZodType<TipTapNode> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1),
      content: z.array(tipTapNode).optional(),
    })
    .passthrough(),
);

/** A TipTap/ProseMirror document: root node of type "doc", bounded in size. */
export const tipTapDocSchema = z
  .object({ type: z.literal("doc"), content: z.array(tipTapNode).optional() })
  .passthrough()
  .refine((d) => JSON.stringify(d).length <= MAX_CONTENT_BYTES, {
    message: "Document is too large",
  });

export const patchDocumentSchema = z
  .object({ title: titleSchema.optional(), content: tipTapDocSchema.optional() })
  .strict()
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: "Nothing to update",
  });

export const uuidSchema = z.string().uuid();

export const shareSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    role: z.enum(["editor", "viewer"], { message: "Role must be editor or viewer" }),
  })
  .strict();

export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input";
}
