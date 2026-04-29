import { Router } from "express";
import multer from "multer";
import {
  addReactionController,
  createConversationController,
  deleteConversationController,
  deleteMessageController,
  editMessageController,
  getConversationController,
  getConversationsController,
  getMessagesController,
  markReadController,
  sendMessageController,
  uploadMediaController,
} from "../controllers/message.controller.js";
import {
  getMessageReceiptsController,
  markConversationReadController,
  markDeliveredReceiptController,
  markReadReceiptController,
} from "../controllers/readReceipt.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  editMessageLimiter,
  mediaUploadLimiter,
  reactionLimiter,
  sendMessageLimiter,
} from "../middlewares/rateLimiter.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createConversationSchema,
  deleteConversationSchema,
  deleteMessageSchema,
  editMessageSchema,
  getConversationSchema,
  getMessageReceiptsSchema,
  getMessagesSchema,
  markAllReadSchema,
  markDeliveredSchema,
  markReadSchema,
  reactionSchema,
  sendMessageSchema,
  uploadMediaSchema,
} from "../validation/message.validator.js";

// ====*** Message Upload Middleware ***=====

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

export const messageRouter = Router();

messageRouter.use(authenticate);

// ====*** Conversation Routes ***=====

messageRouter.post(
  "/conversations",
  validate(createConversationSchema),
  createConversationController
);
messageRouter.get("/conversations", getConversationsController);
messageRouter.get(
  "/conversations/:conversationId",
  validate(getConversationSchema),
  getConversationController
);
messageRouter.delete(
  "/conversations/:conversationId",
  validate(deleteConversationSchema),
  deleteConversationController
);

// ====*** Send Message Route ***=====

messageRouter.post(
  "/:conversationId",
  sendMessageLimiter,
  upload.single("file"),
  validate(sendMessageSchema),
  sendMessageController
);

// ====*** Get Messages Route ***=====

messageRouter.get(
  "/:conversationId",
  validate(getMessagesSchema),
  getMessagesController
);

// ====*** Delete Message Route ***=====

messageRouter.delete(
  "/:conversationId/:messageId",
  validate(deleteMessageSchema),
  deleteMessageController
);

// ====*** Edit Message Route ***=====

messageRouter.patch(
  "/:conversationId/:messageId",
  editMessageLimiter,
  validate(editMessageSchema),
  editMessageController
);

// ====*** Mark Read Routes ***=====

messageRouter.post(
  "/:conversationId/read",
  validate(markAllReadSchema),
  markReadController
);
messageRouter.post(
  "/:conversationId/:messageId/read",
  validate(markReadSchema),
  markReadController
);

// ====*** Read Receipt Routes ***=====

messageRouter.post(
  "/:conversationId/:messageId/delivered",
  validate(markDeliveredSchema),
  markDeliveredReceiptController
);
messageRouter.post(
  "/:conversationId/:messageId/read-receipt",
  validate(markDeliveredSchema),
  markReadReceiptController
);
messageRouter.post(
  "/:conversationId/read-receipts",
  validate(markAllReadSchema),
  markConversationReadController
);
messageRouter.get(
  "/:conversationId/:messageId/receipts",
  validate(getMessageReceiptsSchema),
  getMessageReceiptsController
);

// ====*** Media Upload Route ***=====

messageRouter.post(
  "/conversations/:conversationId/media",
  mediaUploadLimiter,
  upload.single("file"),
  validate(uploadMediaSchema),
  uploadMediaController
);

// ====*** Reaction Routes ***=====

messageRouter.post(
  "/messages/:messageId/reaction",
  reactionLimiter,
  validate(reactionSchema),
  addReactionController
);
messageRouter.delete(
  "/messages/:messageId/reaction",
  reactionLimiter,
  validate(reactionSchema),
  addReactionController
);
