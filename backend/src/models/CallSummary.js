import mongoose from "mongoose";

const callSummarySchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    transcript: {
      type: String,
      default: "",
    },
    summary: {
      type: String,
      default: "",
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // in seconds
    },
    isComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const CallSummary = mongoose.model("CallSummary", callSummarySchema);

export default CallSummary;

