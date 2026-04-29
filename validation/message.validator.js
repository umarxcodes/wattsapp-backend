import { z } from "zod";

// ====*** Shared Message Validation Schemas ***=====

const objectIdSchema = z
  .string({ required_error: "ID is required" })
  .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

const textSchema = z
  .string()
  .trim()
  .min(1, "Message text cannot be empty")
  .max(4096, "Message cannot exceed 4096 characters");

const fileSchema = z.object({
  buffer: z.instanceof(Buffer),
  mimetype: z.string().min(1),
  size: z.number().max(25 * 1024 * 1024, "File size must not exceed 25MB"),
  originalname: z.string().min(1),
});

// ====*** Conversation Validation ***=====

export const createConversationSchema = {
  body: z.object({
    receiverId: objectIdSchema,
  }),
};

export const getConversationSchema = {
  params: z.object({
    conversationId: objectIdSchema,
  }),
};

export const deleteConversationSchema = getConversationSchema;

// ====*** Message Send Validation ***=====

export const sendMessageSchema = {
  params: z.object({
    conversationId: objectIdSchema,
  }),
  body: z.object({
    text: z.string().trim().max(4096).optional(),
    replyTo: objectIdSchema.optional(),
  }),
  file: fileSchema.optional(),
};

// ====*** Message List Validation ***=====

export const getMessagesSchema = {
  params: z.object({
    conversationId: objectIdSchema,
  }),
  query: z.object({
    cursor: objectIdSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
};

// ====*** Message Update Validation ***=====

export const deleteMessageSchema = {
  params: z.object({
    conversationId: objectIdSchema,
    messageId: objectIdSchema,
  }),
};

export const editMessageSchema = {
  params: z.object({
    conversationId: objectIdSchema,
    messageId: objectIdSchema,
  }),
  body: z.object({
    text: textSchema,
  }),
};

// ====*** Message Read Validation ***=====

export const markReadSchema = {
  params: z.object({
    conversationId: objectIdSchema,
    messageId: objectIdSchema.optional(),
  }),
};

export const markAllReadSchema = {
  params: z.object({
    conversationId: objectIdSchema,
  }),
};

export const markDeliveredSchema = {
  params: z.object({
    conversationId: objectIdSchema,
    messageId: objectIdSchema,
  }),
};

// ====*** Media Upload Validation ***=====

export const uploadMediaSchema = {
  params: z.object({
    conversationId: objectIdSchema,
  }),
  file: fileSchema,
};

// ====*** Reaction Validation ***=====

export const reactionSchema = {
  params: z.object({
    messageId: objectIdSchema,
  }),
  body: z
    .object({
      emoji: z.string().trim().max(10).nullable().optional(),
    })
    .optional(),
};

// ====*** Message Receipt Query Validation ***=====

export const getMessageReceiptsSchema = {
  params: z.object({
    conversationId: objectIdSchema,
    messageId: objectIdSchema,
  }),
};
