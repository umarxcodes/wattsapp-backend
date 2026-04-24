/* User model with authentication, validation, and security features */

import mongoose from "mongoose";
import { hashPassword, comparePassword } from "../utils/hash.utils.js";

/* Define user schema structure and validation rules */
const userSchema = new mongoose.Schema(
  {
    /* User phone number (unique identifier for authentication) */
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

    /* Country code for user phone number */
    countryCode: {
      type: String,
      required: [true, "Country code is required"],
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 3,
    },

    /* Hashed user password (excluded from queries by default) */
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    /* Display name shown in application */
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      minlength: [2, "Display name must be at least 2 characters"],
      maxlength: [50, "Display name cannot exceed 50 characters"],
    },

    /* User profile avatar information */
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

    /* Account verification status */
    isVerified: {
      type: Boolean,
      default: false,
    },

    /* Account active/inactive state */
    isActive: {
      type: Boolean,
      default: true,
    },

    /* User role for authorization control */
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "Role must be either user or admin",
      },
      default: "user",
    },

    /* Last seen timestamp for user activity tracking */
    lastSeen: {
      type: Date,
      default: Date.now,
    },

    /* Hashed refresh token for session management */
    refreshTokenHash: {
      type: String,
      select: false,
    },

    /* Timestamp for password change tracking */
    passwordChangedAt: Date,

    /* Login attempt counter for brute-force protection */
    loginAttempts: {
      type: Number,
      default: 0,
    },

    /* Account lock expiration time */
    lockUntil: Date,
  },
  {
    timestamps: true,
  }
);

/* Database indexes for performance optimization */
userSchema.index({ phone: 1 });
userSchema.index({ displayName: "text" });
userSchema.index({ isActive: 1, isVerified: 1 });

/* Virtual field to check if account is currently locked */
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

/* Hash password before saving user document */
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

/* Track password change timestamp for security validation */
userSchema.pre("save", function (next) {
  if (this.isModified("password") && !this.isNew) {
    this.passwordChangedAt = new Date();
  }
  next();
});

/* Compare plain password with hashed password */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return comparePassword(candidatePassword, this.password);
};

/* Increment login attempts and apply account lock if necessary */
userSchema.methods.incLoginAttempts = function () {
  if (this.loginAttempts >= 5) {
    this.lockUntil = Date.now() + 2 * 60 * 60 * 1000;
  }

  this.loginAttempts += 1;
  return this.save();
};

/* Reset login attempts after successful authentication */
userSchema.methods.resetLoginAttempts = function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

/* Customize JSON output to remove sensitive fields */
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

/* Find user by phone number (case-insensitive normalization) */
userSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone: phone.toLowerCase() });
};

/* Create User model from schema */
const User = mongoose.model("User", userSchema);

export default User;
