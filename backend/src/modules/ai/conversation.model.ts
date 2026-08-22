import mongoose, { Schema } from "mongoose";

/** A stored assistant action (e.g. a created poll/form link) so the chat re-renders on resume. */
const actionSchema = new Schema(
  {
    kind: { type: String, required: true },
    entity: String,
    id: String,
    shareToken: String,
    url: String,
    title: String,
  },
  { _id: false, strict: false }
);

const messageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, default: "" },
    actions: { type: [actionSchema], default: undefined },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New chat" },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, updatedAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
