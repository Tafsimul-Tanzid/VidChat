import { createClient } from "@deepgram/sdk";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "";

// Get temporary Deepgram auth token for client-side usage
export async function getDeepgramToken(req, res) {
  try {
    if (!DEEPGRAM_API_KEY) {
      console.error("⚠️ DEEPGRAM_API_KEY not found in environment variables");
      return res.status(500).json({ 
        message: "Deepgram API key not configured. Please add DEEPGRAM_API_KEY to your .env file. Get free key at: https://console.deepgram.com/signup" 
      });
    }

    const deepgram = createClient(DEEPGRAM_API_KEY);

    // Create a temporary key for the client (expires in 10 seconds, enough for connection)
    const { result, error } = await deepgram.manage.createProjectKey(
      process.env.DEEPGRAM_PROJECT_ID || "default",
      {
        comment: "Temporary key for VidChat",
        scopes: ["usage:write"],
        time_to_live_in_seconds: 3600, // 1 hour
      }
    );

    if (error) {
      console.error("Error creating Deepgram key:", error);
      // Fallback: return the main API key (not recommended for production)
      return res.status(200).json({ key: DEEPGRAM_API_KEY });
    }

    res.status(200).json({ key: result.key });
  } catch (error) {
    console.error("Error in getDeepgramToken controller:", error.message);
    // Fallback: return the main API key
    res.status(200).json({ key: DEEPGRAM_API_KEY });
  }
}

