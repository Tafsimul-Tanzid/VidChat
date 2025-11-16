import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken, generateCallSummary, getDeepgramToken } from "../lib/api";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";
import CallSummary from "../components/CallSummary";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const CallPage = () => {
  const { id: callId } = useParams();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const { authUser, isLoading } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initCall = async () => {
      if (!tokenData?.token || !authUser || !callId) return;

      try {
        console.log("Initializing Stream video client...");

        const user = {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        };

        const videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user,
          token: tokenData.token,
        });

        const callInstance = videoClient.call("default", callId);

        await callInstance.join({ create: true });

        console.log("Joined call successfully");

        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        console.error("Error joining call:", error);
        toast.error("Could not join the call. Please try again.");
      } finally {
        setIsConnecting(false);
      }
    };

    initCall();
  }, [tokenData, authUser, callId]);

  if (isLoading || isConnecting) return <PageLoader />;

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="relative">
        {client && call ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent />
            </StreamCall>
          </StreamVideo>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p>Could not initialize call. Please refresh or try again later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CallContent = () => {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const { id: callId } = useParams();
  const { authUser } = useAuthUser();

  const navigate = useNavigate();

  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  const finalTranscriptRef = useRef("");
  const deepgramConnectionRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Initialize Deepgram transcription when call starts
  useEffect(() => {
    if (callingState !== CallingState.JOINED) {
      return;
    }

    console.log("🎤 Initializing Deepgram transcription...");
    setShowSummary(true);
    if (!callStartTime) {
      setCallStartTime(Date.now());
    }

    const initDeepgram = async () => {
      try {
        // Get Deepgram token
        const { key } = await getDeepgramToken();
        
        if (!key) {
          console.error("❌ No Deepgram key received");
          toast.error("Transcription unavailable. Please add DEEPGRAM_API_KEY to backend .env");
          return;
        }

        console.log("✅ Deepgram key received");

        // Get user media (microphone)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("🎵 Microphone access granted");

        // Create Deepgram client
        const deepgram = createClient(key);
        const connection = deepgram.listen.live({
          model: "nova-2",
          language: "en-US",
          smart_format: true,
          interim_results: false,
        });

        connection.on(LiveTranscriptionEvents.Open, () => {
          console.log("✅ Deepgram connection opened");
          toast.success("AI transcription started!", { duration: 3000 });

          // Create MediaRecorder to send audio to Deepgram
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: "audio/webm",
          });

          mediaRecorder.addEventListener("dataavailable", (event) => {
            if (event.data.size > 0 && connection.getReadyState() === 1) {
              connection.send(event.data);
            }
          });

          mediaRecorder.start(250); // Send audio chunks every 250ms
          mediaRecorderRef.current = mediaRecorder;
          console.log("🎙️ Recording started");
        });

        connection.on(LiveTranscriptionEvents.Transcript, (data) => {
          const transcript = data.channel.alternatives[0].transcript;
          
          if (transcript && transcript.trim().length > 0) {
            console.log("📝 Transcribed:", transcript);
            finalTranscriptRef.current += transcript + " ";
            setTranscript(finalTranscriptRef.current);
          }
        });

        connection.on(LiveTranscriptionEvents.Error, (error) => {
          console.error("❌ Deepgram error:", error);
        });

        connection.on(LiveTranscriptionEvents.Close, () => {
          console.log("🔌 Deepgram connection closed");
        });

        deepgramConnectionRef.current = connection;

      } catch (error) {
        console.error("❌ Error initializing Deepgram:", error);
        toast.error("Could not start transcription. Check console for details.");
      }
    };

    initDeepgram();

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up Deepgram...");
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (deepgramConnectionRef.current) {
        deepgramConnectionRef.current.finish();
      }
    };
  }, [callingState, callStartTime]);

  // Generate summary periodically (every 30 seconds for testing, change to 120000 for production)
  useEffect(() => {
    if (callingState === CallingState.JOINED) {
      console.log("Setting up periodic summary generation...");
      const intervalId = setInterval(() => {
        console.log("Checking transcript length:", finalTranscriptRef.current.length);
        if (finalTranscriptRef.current.length > 50) {
          console.log("Generating periodic summary...");
          generateSummary(false);
        } else {
          console.log("Not enough transcript yet. Keep talking!");
        }
      }, 30000); // 30 seconds for testing (change to 120000 for 2 minutes)

      return () => {
        clearInterval(intervalId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callingState]);

  // Update call duration
  useEffect(() => {
    if (callStartTime) {
      const interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [callStartTime]);

  // Generate final summary when call ends
  useEffect(() => {
    if (callingState === CallingState.LEFT && finalTranscriptRef.current.length > 50) {
      generateSummary(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callingState]);

  const generateSummary = async (isComplete) => {
    if (!finalTranscriptRef.current || finalTranscriptRef.current.length < 50) {
      console.log("Transcript too short, skipping summary generation");
      return;
    }

    console.log("🤖 Generating AI summary...", {
      transcriptLength: finalTranscriptRef.current.length,
      isComplete,
    });

    setIsGenerating(true);
    try {
      const participantIds = participants
        .map((p) => p.userId)
        .filter((id) => id !== authUser?._id);

      console.log("Calling API with:", {
        callId,
        transcriptLength: finalTranscriptRef.current.length,
        participants: [authUser?._id, ...participantIds],
      });

      const result = await generateCallSummary(
        callId,
        finalTranscriptRef.current,
        [authUser?._id, ...participantIds],
        isComplete
      );

      console.log("✅ Summary generated:", result);

      if (result.summary) {
        setSummary(result.summary);
        if (isComplete) {
          toast.success("Call summary generated!");
        } else {
          toast.success("Summary updated!");
        }
      }
    } catch (error) {
      console.error("❌ Error generating summary:", error);
      if (isComplete) {
        toast.error("Could not generate summary");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (callingState === CallingState.LEFT) {
    // Show final summary before navigating
    if (summary) {
      setTimeout(() => navigate("/"), 5000);
    } else {
      navigate("/");
    }
  }

  return (
    <StreamTheme>
      <SpeakerLayout />
      <CallControls />
      
      {showSummary && (
        <CallSummary
          summary={summary}
          isGenerating={isGenerating}
          onClose={() => setShowSummary(false)}
          callDuration={callDuration}
          participants={participants}
          transcript={transcript}
          onGenerateSummary={() => generateSummary(false)}
        />
      )}
    </StreamTheme>
  );
};

export default CallPage;
