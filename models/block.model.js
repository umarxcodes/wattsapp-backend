import mongoose from "mongoose";

// ====*** Block Schema ***=====

const blockSchema = new mongoose.Schema(
  {
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    blockedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ====*** Block Indexes ***=====

blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

// ====*** Block JSON Transform ***=====

blockSchema.methods.toJSON = function () {
  const value = this.toObject({ virtuals: true });
  value.id = value._id.toString();
  delete value._id;
  delete value.__v;
  return value;
};

export const Block =
  mongoose.models.Block || mongoose.model("Block", blockSchema);
