import StarterKit from "@tiptap/starter-kit";

/**
 * The document schema, shared by the browser editor and server-side import so
 * imported content can only contain nodes the editor understands. Links and
 * code blocks are out of scope (and links would need href vetting).
 */
export const baseExtensions = [
  StarterKit.configure({ link: false, codeBlock: false, heading: { levels: [1, 2, 3] } }),
];
