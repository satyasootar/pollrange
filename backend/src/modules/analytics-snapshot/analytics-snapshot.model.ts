import mongoose, { Schema } from "mongoose";
import type { IAnalyticsSnapshot } from "./analytics-snapshot.validation.js";

const optionCountSchema = new Schema(
  {
    optionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    count: {
      type: Number,
      required: true,
    },

    percentage: {
      type: Number,
      required: true,
    },
  }
);

const questionStatSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    optionCounts: [optionCountSchema],

    skippedCount: {
      type: Number,
      required: true,
    },

    responseCount: {
      type: Number,
      required: true,
    },
  }
);

const timeSeriesDataSchema = new Schema(
  {
    hour: {
      type: Date,
      required: true,
    },

    count: {
      type: Number,
      required: true,
    },
  }
);

const analyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
  {
    pollId: {
      type: Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
      index: true,
    },

    snapshotAt: {
      type: Date,
      required: true,
    },

    totalResponses: {
      type: Number,
      required: true,
    },

    questionStats: [questionStatSchema],

    timeSeriesData: [timeSeriesDataSchema],
  },
  {
    timestamps: true,
  }
);

analyticsSnapshotSchema.index({ pollId: 1, snapshotAt: -1 });

export const AnalyticsSnapshot = mongoose.model<IAnalyticsSnapshot>("AnalyticsSnapshot", analyticsSnapshotSchema);
