import mongoose from "mongoose";

// ====*** Message Reaction Schema ***=====

const reactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      maxlength: 10,
    },
  },
  {
    _id: false,
    timestamps: true,
  }
);

// ====*** Message Receipt Schema ***=====

const receiptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

// ====*** Message Schema ***=====

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 4096,
      default: null,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "voice", "system"],
      default: "text",
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaPublicId: {
      type: String,
      default: null,
    },
    mediaMimeType: {
      type: String,
      default: null,
    },
    mediaSize: {
      type: Number,
      default: null,
    },
    mediaName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    receiptStatus: {
      type: [receiptSchema],
      default: [],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ====*** Message Indexes ***=====

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ "receiptStatus.userId": 1 });

// ====*** Message Validation ***=====

messageSchema.pre("validate", function (next) {
  if (this.isDeleted) {
    next();
    return;
  }

  const hasText = typeof this.text === "string" && this.text.trim().length > 0;
  const hasMedia = Boolean(this.mediaUrl);

  if (!hasText && !hasMedia) {
    next(new Error("A message must contain text or media"));
    return;
  }

  next();
});

// ====*** Message Receipt Helpers ***=====

messageSchema.methods.upsertReceipt = function (userId, type) {
  const existingReceipt = this.receiptStatus.find(
    (receipt) => receipt.userId.toString() === userId.toString()
  );
  const timestamp = new Date();

  if (!existingReceipt) {
    this.receiptStatus.push({
      userId,
      deliveredAt: type === "delivered" || type === "read" ? timestamp : null,
      readAt: type === "read" ? timestamp : null,
    });
  } else {
    if (
      (type === "delivered" || type === "read") &&
      !existingReceipt.deliveredAt
    ) {
      existingReceipt.deliveredAt = timestamp;
    }

    if (type === "read") {
      existingReceipt.readAt = timestamp;
      if (!existingReceipt.deliveredAt) {
        existingReceipt.deliveredAt = timestamp;
      }
    }
  }

  return timestamp;
};

messageSchema.methods.syncAggregateReceiptState = function () {
  const deliveredCount = this.receiptStatus.filter(
    (receipt) => receipt.deliveredAt
  ).length;
  const readCount = this.receiptStatus.filter(
    (receipt) => receipt.readAt
  ).length;

  if (readCount > 0) {
    this.status = "read";
    this.readAt =
      this.receiptStatus
        .filter((receipt) => receipt.readAt)
        .sort((left, right) => right.readAt - left.readAt)[0]?.readAt ||
      this.readAt;
  } else if (deliveredCount > 0) {
    this.status = "delivered";
  }

  if (deliveredCount > 0 && !this.deliveredAt) {
    this.deliveredAt =
      this.receiptStatus
        .filter((receipt) => receipt.deliveredAt)
        .sort((left, right) => right.deliveredAt - left.deliveredAt)[0]
        ?.deliveredAt || this.deliveredAt;
  }
};

// ====*** Message Instance Helpers ***=====

messageSchema.methods.markAsDelivered = function (userId = null) {
  if (userId) {
    this.upsertReceipt(userId, "delivered");
    this.syncAggregateReceiptState();
  } else if (this.status === "sent") {
    this.status = "delivered";
    this.deliveredAt = new Date();
  }

  return this.save();
};

messageSchema.methods.markAsRead = function (userId = null) {
  if (userId) {
    this.upsertReceipt(userId, "read");
    this.syncAggregateReceiptState();
  } else {
    this.status = "read";
    this.readAt = new Date();
    if (!this.deliveredAt) {
      this.deliveredAt = this.readAt;
    }
  }

  return this.save();
};

messageSchema.methods.softDelete = function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.text = null;
  this.mediaUrl = null;
  this.mediaPublicId = null;
  this.mediaMimeType = null;
  this.mediaSize = null;
  this.mediaName = null;
  return this.save();
};

// ====*** Message JSON Transform ***=====

messageSchema.methods.toJSON = function () {
  const value = this.toObject({ virtuals: true });
  value.id = value._id.toString();
  delete value._id;
  delete value.__v;
  return value;
};

export const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
