// models/user.model.js
/** Feature: User model with validation, hooks, and security features */
/** Feature: Password hashing, JSON transformation, and utility methods */

import mongoose from "mongoose";
import { hashPassword, comparePassword } from "../utils/hash.utils.js";

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^\+\d{10,15}$/.test(v);
        },
        message: "Invalid phone number format",
      },
    },
    countryCode: {
      type: String,
      required: [true, "Country code is required"],
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 3,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include in queries by default
    },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      minlength: [2, "Display name must be at least 2 characters"],
      maxlength: [50, "Display name cannot exceed 50 characters"],
    },
    avatar: {
      url: {
        type: String,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: "Invalid avatar URL",
        },
      },
      publicId: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "Role must be either user or admin",
      },
      default: "user",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    passwordChangedAt: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ phone: 1 });
userSchema.index({ displayName: "text" });
userSchema.index({ isActive: 1, isVerified: 1 });

// Virtual for account lock
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save hook: Hash password
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      this.password = await hashPassword(this.password);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-save hook: Set passwordChangedAt
userSchema.pre("save", function (next) {
  if (this.isModified("password") && !this.isNew) {
    this.passwordChangedAt = new Date();
  }
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  return comparePassword(candidatePassword, this.password);
};

userSchema.methods.incLoginAttempts = function () {
  if (this.loginAttempts >= 5) {
    this.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  }
  this.loginAttempts += 1;
  return this.save();
};

userSchema.methods.resetLoginAttempts = function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

// Transform toJSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.__v;
  delete userObject.password;
  delete userObject.refreshTokenHash;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  userObject.id = userObject._id;
  delete userObject._id;
  return userObject;
};

// Static methods
userSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone: phone.toLowerCase() });
};

const User = mongoose.model("User", userSchema);

export default User;
/* =====*** User model implemented ***==== */
