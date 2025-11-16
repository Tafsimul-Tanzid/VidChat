import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getStreamToken } from "../controllers/chat.controller.js";
import { translateMessage } from "../controllers/translation.controller.js";
import {
  createOrUpdateSummary,
  getCallSummary,
  getUserCallSummaries,
} from "../controllers/summary.controller.js";
import { getDeepgramToken } from "../controllers/deepgram.controller.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);
router.post("/translate", protectRoute, translateMessage);

// Call summary routes
router.post("/summarize", protectRoute, createOrUpdateSummary);
router.get("/summaries/:callId", protectRoute, getCallSummary);
router.get("/summaries", protectRoute, getUserCallSummaries);

// Deepgram transcription
router.get("/deepgram-token", protectRoute, getDeepgramToken);

export default router;
