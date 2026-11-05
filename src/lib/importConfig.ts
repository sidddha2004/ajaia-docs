// Client-safe import limits (no parser imports here).
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024; // 2 MB
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const ACCEPT_ATTR = ".txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const SUPPORTED_LABEL = ".txt, .md, .docx · max 2 MB";
