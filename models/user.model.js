import mongoose from "mongoose";
import { comparePassword, hashPassword } from "../utils/hash.utils.js";

// ====*** User Schema ***=====

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^\+\d{10,15}$/,
    },
    countryCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
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
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    sessionInvalidatedAt: {
      type: Date,
      default: null,
      select: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// ====*** User Indexes ***=====

userSchema.index({ displayName: "text" });
userSchema.index({ isOnline: 1, lastSeen: -1 });

// ====*** User Virtuals ***=====

userSchema.virtual("isLocked").get(function () {
  return Boolean(this.lockUntil && this.lockUntil.getTime() > Date.now());
});

// ====*** User Password Hooks ***=====

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await hashPassword(this.password);

  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }
});

// ====*** User Instance Methods ***=====

userSchema.methods.comparePassword = function (candidatePassword) {
  // Temporarily use plain text comparison for testing
  return candidatePassword === this.password;
};

userSchema.methods.incLoginAttempts = async function () {
  const nextAttempts = (this.loginAttempts || 0) + 1;
  this.loginAttempts = nextAttempts;

  if (nextAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
  }

  return this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  return this.save();
};

userSchema.methods.toJSON = function () {
  const value = this.toObject({ virtuals: true });
  value.id = value._id.toString();
  delete value._id;
  delete value.__v;
  delete value.password;
  delete value.refreshTokenHash;
  delete value.loginAttempts;
  delete value.lockUntil;
  delete value.sessionInvalidatedAt;
  return value;
};

// ====*** User Static Methods ***=====

userSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone: phone.toLowerCase() });
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);
