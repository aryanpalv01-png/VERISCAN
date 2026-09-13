import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { runForensicAnalysis } from "./forensics";
import { createChecks, createDocument, finalizeDocument, getUserDocumentReport, listUserDocuments, requestDocumentReview, updateDocumentEvidence } from "./db";
import { storagePut, storageDelete } from "./storage";
import { authService } from "./authService";
import { sendVerificationOtpEmail } from "./services/email";

const documentType = z.enum(["aadhaar", "pan", "passport", "marksheet", "bank_statement", "other"]);
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(4, "Password must be at least 4 characters"),
          name: z.string().min(1, "Name is required"),
          role: z.enum(["user", "admin"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { user, token } = await authService.register(input);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        });
        return { user, token };
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1, "Password is required"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { user, token } = await authService.login(input);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        });
        return { user, token };
      }),
    quickLogin: publicProcedure
      .input(
        z.object({
          profile: z.enum(["analyst", "investigator", "auditor"]).default("analyst"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { user, token } = await authService.quickLogin(input.profile);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        });
        return { user, token };
      }),
    sendOtp: publicProcedure
      .input(
        z.object({
          email: z.string().email("Valid email address is required"),
          redirectUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const email = input.email.trim().toLowerCase();
        const code = authService.generateOtp(email);
        const emailResult = await sendVerificationOtpEmail({
          email,
          otpCode: code,
          redirectUrl: input.redirectUrl,
        });
        return {
          success: true,
          message: emailResult.message || `Verification passcode dispatched to ${email}`,
          devCode: code,
          bypassed: emailResult.bypassed,
        };
      }),
    verifyOtp: publicProcedure
      .input(
        z.object({
          email: z.string().email("Valid email address is required"),
          token: z.string().min(4, "Verification token is required"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const email = input.email.trim().toLowerCase();
        const valid = authService.verifyOtpCode(email, input.token);
        if (!valid) {
          throw new Error("Invalid or expired verification passcode. Please check and retry.");
        }
        const { user, token } = await authService.loginOrCreateWithEmail(email);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        });
        return { user, token };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  scans: router({
    list: protectedProcedure.query(({ ctx }) => listUserDocuments(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => getUserDocumentReport(input.id, ctx.user.id)),
    create: protectedProcedure.input(z.object({
      fileName: z.string().min(1).max(255),
      mimeType: z.string().refine((value) => allowedMimeTypes.has(value), "Unsupported file type"),
      fileSize: z.number().int().positive().max(10 * 1024 * 1024),
      documentType: documentType.default("other"),
      contentBase64: z.string().min(1),
    })).mutation(async ({ ctx, input }) => {
      const content = Buffer.from(input.contentBase64, "base64");
      if (content.length !== input.fileSize) throw new Error("Uploaded file size did not match the declared size");
      const storage = await storagePut(`${ctx.user.id}/documents/${input.fileName}`, content, input.mimeType);
      const referenceCode = `VS-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      const created = await createDocument({ userId: ctx.user.id, fileKey: storage.key, fileUrl: storage.url, documentType: input.documentType, originalFilename: input.fileName, mimeType: input.mimeType, fileSize: input.fileSize, status: "processing", confidenceScore: 0, referenceCode });
      if (!created) throw new Error("Document record could not be created");
      const analysis = await runForensicAnalysis({ filename: input.fileName, mimeType: input.mimeType, fileSize: input.fileSize, documentType: input.documentType, content });
      await createChecks(analysis.checks.map((check) => ({ documentId: created.id, checkName: check.checkName, result: check.result, confidence: check.confidence, explanation: check.explanation, flaggedRegion: check.flaggedRegion ?? null, provider: check.provider, providerState: analysis.providerHealth[check.provider] ?? "not_applicable" })));
      await updateDocumentEvidence(created.id, ctx.user.id, { providerHealth: analysis.providerHealth, extractedFields: analysis.extractedFields, comparisonFindings: analysis.comparisonFindings });
      await finalizeDocument(created.id, ctx.user.id, analysis.status, analysis.score);

      // Automated Data Lifecycle: raw uploaded image is purged to minimize data exposure,
      // while cryptographic SHA-256 hash, normalized check outcomes, and audit report are retained.
      if (process.env.AUTO_PURGE_RAW_DOCUMENTS === "true") {
        await storageDelete(storage.key).catch(() => {});
      }

      return {
        id: created.id,
        referenceCode,
        status: analysis.status,
        confidenceScore: analysis.score,
        score: analysis.score,
        activeModulesCount: analysis.activeModulesCount ?? analysis.checks.filter((c) => c.result === "pass" || c.result === "flag").length,
        checks: analysis.checks,
        extractedFields: analysis.extractedFields,
        comparisonFindings: analysis.comparisonFindings,
        providerHealth: analysis.providerHealth,
        summary: analysis.summary,
      };

    }),
    requestReview: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => requestDocumentReview(input.id, ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
