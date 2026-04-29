import mongoose from "mongoose";
import { Conversation } from "./conversation.model.js";

// ====*** Group Conversation Schema ***=====

const groupSchema = new mongoose.Schema({});

// ====*** Group Model Export ***=====

export const Group =
  mongoose.models.Group ||
  Conversation.discriminator("Group", groupSchema, "group");
