import mongoose from "mongoose";

// ====*** Conversation Settings Schema ***=====

const conversationSettingsSchema = new mongoose.Schema(
  {
    onlyAdminsCanSend: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

// ====*** Conversation Schema ***=====
const conversationSchema = new mongoose.Schema(
  {
    conversationType: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    title: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    avatar: {
      url: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    settings: {
      type: conversationSettingsSchema,
      default: () => ({}),
    },
    directConversationKey: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    discriminatorKey: "conversationType",
  }
);

// ====*** Conversation Indexes ***=====

conversationSchema.index({ participants: 1 });
conversationSchema.index({ conversationType: 1, lastMessageAt: -1 });
conversationSchema.index({ owner: 1 });

// ====*** Conversation Validation ***=====

conversationSchema.pre("validate", function (next) {
  const uniqueParticipants = [...new Set(this.participants.map(String))];
  this.participants = uniqueParticipants;

  if (this.conversationType === "direct") {
    if (uniqueParticipants.length !== 2) {
      next(
        new Error(
          "A direct conversation must contain exactly two unique participants"
        )
      );
      return;
    }

    this.directConversationKey = [...uniqueParticipants].sort().join(":");
    this.title = null;
    this.description = null;
    this.owner = null;
    this.createdBy = null;
    this.admins = [];
  } else {
    if (uniqueParticipants.length < 2) {
      next(
        new Error("A group conversation must contain at least two participants")
      );
      return;
    }

    if (!this.title?.trim()) {
      next(new Error("Group title is required"));
      return;
    }

    if (!this.owner) {
      next(new Error("Group owner is required"));
      return;
    }

    if (!this.createdBy) {
      this.createdBy = this.owner;
    }

    const uniqueAdmins = [...new Set((this.admins || []).map(String))];
    if (!uniqueAdmins.includes(String(this.owner))) {
      uniqueAdmins.push(String(this.owner));
    }

    this.admins = uniqueAdmins;
    this.directConversationKey = null;
  }

  next();
});

// ====*** Conversation JSON Transform ***=====

conversationSchema.methods.toJSON = function () {
  const value = this.toObject({ virtuals: true });
  value.id = value._id.toString();
  delete value._id;
  delete value.__v;
  return value;
};

// ====*** Conversation Membership Helpers ***=====

conversationSchema.methods.hasParticipant = function (userId) {
  return this.participants.some(
    (participantId) => participantId.toString() === userId.toString()
  );
};

conversationSchema.methods.isAdmin = function (userId) {
  return this.admins.some(
    (adminId) => adminId.toString() === userId.toString()
  );
};

// ====*** Conversation Static Helpers ***=====

conversationSchema.statics.findConversationBetweenUsers = function (
  userA,
  userB
) {
  const directConversationKey = [userA.toString(), userB.toString()]
    .sort()
    .join(":");

  return this.findOne({
    conversationType: "direct",
    directConversationKey,
  });
};

export const Conversation =
  mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);
