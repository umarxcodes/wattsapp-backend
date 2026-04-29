import { z } from "zod";

// ====*** Group Validation Schemas ***=====

const objectIdSchema = z
  .string({ required_error: "ID is required" })
  .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

const memberIdsSchema = z
  .array(objectIdSchema)
  .min(1, "At least one member is required");

export const createGroupSchema = {
  body: z.object({
    title: z.string().trim().min(1, "Group title is required").max(100),
    description: z.string().trim().max(500).optional(),
    memberIds: memberIdsSchema,
    onlyAdminsCanSend: z.boolean().optional(),
  }),
};

export const groupIdSchema = {
  params: z.object({
    groupId: objectIdSchema,
  }),
};

export const updateGroupSchema = {
  params: z.object({
    groupId: objectIdSchema,
  }),
  body: z.object({
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    onlyAdminsCanSend: z.boolean().optional(),
  }),
};

export const addGroupMembersSchema = {
  params: z.object({
    groupId: objectIdSchema,
  }),
  body: z.object({
    memberIds: memberIdsSchema,
  }),
};

export const groupMemberParamsSchema = {
  params: z.object({
    groupId: objectIdSchema,
    memberId: objectIdSchema,
  }),
};

export const transferGroupOwnershipSchema = {
  params: z.object({
    groupId: objectIdSchema,
  }),
  body: z.object({
    nextOwnerId: objectIdSchema,
  }),
};
