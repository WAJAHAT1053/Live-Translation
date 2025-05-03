import { useState, useEffect, useCallback, useRef } from 'react';

export default function useTranslation(sourceLanguage, targetLanguage) {
  const [translation, setTranslation] = useState('');
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const translateAndPlay = useCallback(async (blob) => {
    if (!blob || !sourceLanguage || !targetLanguage) return;

    try {
      console.log("🎙️ Uploading audio for translation...");

      const file = new File([blob], "recording.webm", { type: "audio/webm" });

      const formData = new FormData();
      formData.append("audio", file);
      formData.append("source_language", sourceLanguage);
      formData.append("target_language", targetLanguage);

      const response = await fetch('http://localhost:8000/translate-audio', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      // Get source and translated texts from response headers
      const sourceTextBase64 = response.headers.get("source-text-base64");
      const translatedTextBase64 = response.headers.get("translated-text-base64");

      if (sourceTextBase64 && translatedTextBase64) {
        const decodedSource = atob(sourceTextBase64);
        const decodedTranslated = atob(translatedTextBase64);
        console.log("📜 Original:", decodedSource);
        console.log("🌎 Translated:", decodedTranslated);
        setTranslation(decodedTranslated);
      } else {
        console.warn("⚠️ No translation metadata received.");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play the translated audio
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onpause = () => setIsPlaying(false);

      await audioRef.current.play();
      setError(null);

    } catch (err) {
      console.error('❌ Translation/audio error:', err);
      setError(err.message);
    }
  }, [sourceLanguage, targetLanguage]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  return {
    translation,
    error,
    isPlaying,
    translateAndPlay,
  };
}
