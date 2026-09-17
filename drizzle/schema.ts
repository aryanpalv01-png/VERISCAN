import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 768 }).notNull(),
  documentType: mysqlEnum("documentType", ["aadhaar", "pan", "passport", "marksheet", "bank_statement", "medical_bill", "prescription", "scheme_document", "other"]).default("other").notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["processing", "verified", "needs_review", "likely_forged"]).default("processing").notNull(),
  confidenceScore: int("confidenceScore").default(0).notNull(),
  referenceCode: varchar("referenceCode", { length: 32 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  providerHealth: json("providerHealth"),
  extractedFields: json("extractedFields"),
  comparisonFindings: json("comparisonFindings"),
});

export const checks = mysqlTable("checks", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  checkName: varchar("checkName", { length: 120 }).notNull(),
  result: mysqlEnum("result", ["pass", "flag", "not_applicable"]).notNull(),
  confidence: int("confidence").default(0).notNull(),
  explanation: text("explanation").notNull(),
  flaggedRegion: json("flaggedRegion"),
  provider: varchar("provider", { length: 32 }),
  providerState: varchar("providerState", { length: 24 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  reviewerId: int("reviewerId"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  reviewerNotes: text("reviewerNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  keyHash: varchar("keyHash", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type Check = typeof checks.$inferSelect;
export type InsertCheck = typeof checks.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
