import { z } from "zod";

// ====*** Block Validation Schemas ***=====

const objectIdSchema = z
  .string({ required_error: "ID is required" })
  .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

export const blockUserSchema = {
  body: z.object({
    blockedUserId: objectIdSchema,
  }),
};

export const unblockUserSchema = {
  params: z.object({
    blockedUserId: objectIdSchema,
  }),
};
