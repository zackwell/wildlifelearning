import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** 第三方登录（微信等）预留 */
export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    providerAccountIdx: uniqueIndex("oauth_provider_account_idx").on(
      t.provider,
      t.providerAccountId,
    ),
  }),
);

export const userFieldGuides = pgTable(
  "user_field_guides",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull(),
    starred: boolean("starred").notNull().default(false),
    species: jsonb("species").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userSavedIdx: index("user_field_guides_user_saved_idx").on(t.userId, t.savedAt),
  }),
);

export const userQuestionSets = pgTable(
  "user_question_sets",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull(),
    fieldGuideId: text("field_guide_id").notNull(),
    speciesName: text("species_name").notNull(),
    title: text("title").notNull(),
    questions: jsonb("questions").notNull(),
    gradingStandard: jsonb("grading_standard").notNull(),
  },
  (t) => ({
    userSavedIdx: index("user_question_sets_user_saved_idx").on(t.userId, t.savedAt),
  }),
);

export const userLiteratureMeta = pgTable(
  "user_literature_meta",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull(),
    enabledForAsk: boolean("enabled_for_ask").notNull().default(true),
  },
  (t) => ({
    userUploadedIdx: index("user_literature_meta_user_idx").on(t.userId, t.uploadedAt),
  }),
);

export type DbUser = typeof users.$inferSelect;
