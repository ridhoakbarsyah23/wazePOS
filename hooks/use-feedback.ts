import { useState, useRef, useEffect, useCallback } from "react";
import type { FeedbackData } from "@/components/ui/feedback-alert";

export function useFeedback(durationMs = 15000) {
  const [feedback, setFeedbackState] = useState<FeedbackData | null>(null);
  const [feedbackKey, setFeedbackKey] = useState(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const showFeedback = useCallback((type: "success" | "error", message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedbackState({ type, message });
    setFeedbackKey((key) => key + 1);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackState(null);
      feedbackTimerRef.current = null;
    }, durationMs);
  }, [durationMs]);

  const dismissFeedback = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
    setFeedbackState(null);
  }, []);

  return {
    feedback,
    feedbackKey,
    showFeedback,
    dismissFeedback,
  };
}
