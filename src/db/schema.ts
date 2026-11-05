import {
  pgTable,
  pgEnum,
  serial,
  text,
  varchar,
  uuid,
  jsonb,
  timestamp,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  avatarColor: varchar("avatar_color", { length: 16 }).notNull(),
});

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull().default("Untitled document"),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_owner_idx").on(t.ownerId)],
);

export const shareRole = pgEnum("share_role", ["editor", "viewer"]);

export const documentShares = pgTable(
  "document_shares",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: shareRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.documentId, t.userId] }),
    index("document_shares_user_idx").on(t.userId),
  ],
);

export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentShare = typeof documentShares.$inferSelect;
export type ShareRole = (typeof shareRole.enumValues)[number];
