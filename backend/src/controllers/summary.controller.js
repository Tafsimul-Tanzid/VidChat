import CallSummary from "../models/CallSummary.js";
import axios from "axios";

// Hugging Face Inference API endpoint - REQUIRES FREE TOKEN
// Get your free token at: https://huggingface.co/settings/tokens
const HF_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
const HF_TOKEN = process.env.HF_TOKEN || "";

async function generateSummaryWithHF(text) {
  try {
    // If text is too short, return it as is
    if (text.length < 100) {
      return text;
    }

    // Check if token is provided
    if (!HF_TOKEN) {
      console.error("⚠️ HF_TOKEN not found in environment variables");
      return "AI summary requires Hugging Face token. Please add HF_TOKEN to your .env file. Get free token at: https://huggingface.co/settings/tokens";
    }

    const headers = {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
    };

    console.log("🤖 Calling Hugging Face API...");
    const response = await axios.post(
      HF_API_URL,
      {
        inputs: text,
        parameters: {
          max_length: 150,
          min_length: 30,
          do_sample: false,
        },
      },
      {
        headers,
        timeout: 30000, // 30 second timeout
      }
    );

    console.log("✅ Hugging Face response received");

    if (response.data && response.data[0] && response.data[0].summary_text) {
      return response.data[0].summary_text;
    }

    // If model is loading, return a message
    if (response.data && response.data.error && response.data.error.includes("loading")) {
      return "AI model is loading. Please try again in 20-30 seconds.";
    }

    return "Unable to generate summary at this time.";
  } catch (error) {
    console.error("❌ Error generating summary:", error.message);
    
    // If model is loading or rate limited, provide helpful message
    if (error.response?.data?.error) {
      const errorMsg = error.response.data.error;
      console.error("API Error:", errorMsg);
      if (errorMsg.includes("loading")) {
        return "AI model is loading. Please try again in 20-30 seconds.";
      }
      if (errorMsg.includes("rate limit")) {
        return "Rate limit reached. Please try again later.";
      }
      if (errorMsg.includes("Unauthorized") || errorMsg.includes("401")) {
        return "Invalid Hugging Face token. Please check your HF_TOKEN in .env file.";
      }
    }
    
    return "Unable to generate summary. Please check backend logs for details.";
  }
}

export async function createOrUpdateSummary(req, res) {
  try {
    const { callId, transcript, participants, isComplete } = req.body;

    if (!callId || !transcript) {
      return res.status(400).json({ message: "CallId and transcript are required" });
    }

    // Generate summary using Hugging Face
    const summary = await generateSummaryWithHF(transcript);

    // Find existing summary or create new one
    let callSummary = await CallSummary.findOne({ callId });

    if (callSummary) {
      // Update existing summary
      callSummary.transcript = transcript;
      callSummary.summary = summary;
      
      if (isComplete) {
        callSummary.endTime = new Date();
        callSummary.isComplete = true;
        
        // Calculate duration in seconds
        if (callSummary.startTime) {
          callSummary.duration = Math.floor(
            (callSummary.endTime - callSummary.startTime) / 1000
          );
        }
      }

      await callSummary.save();
    } else {
      // Create new summary
      callSummary = await CallSummary.create({
        callId,
        transcript,
        summary,
        participants: participants || [req.user.id],
        isComplete: isComplete || false,
        startTime: new Date(),
      });
    }

    res.status(200).json(callSummary);
  } catch (error) {
    console.error("Error in createOrUpdateSummary controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getCallSummary(req, res) {
  try {
    const { callId } = req.params;

    const callSummary = await CallSummary.findOne({ callId }).populate(
      "participants",
      "fullName profilePic"
    );

    if (!callSummary) {
      return res.status(404).json({ message: "Call summary not found" });
    }

    res.status(200).json(callSummary);
  } catch (error) {
    console.error("Error in getCallSummary controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUserCallSummaries(req, res) {
  try {
    const userId = req.user.id;

    const callSummaries = await CallSummary.find({
      participants: userId,
      isComplete: true,
    })
      .populate("participants", "fullName profilePic")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json(callSummaries);
  } catch (error) {
    console.error("Error in getUserCallSummaries controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

