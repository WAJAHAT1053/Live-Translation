import { useState, useEffect, useCallback, useRef } from 'react';

export default function useTranslation(sourceLanguage, targetLanguage) {
  const [translation, setTranslation] = useState('');
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const translateAndPlay = useCallback(async (blob) => {
    if (!blob || !sourceLanguage || !targetLanguage) {
      console.error('❌ Missing required parameters:', {
        hasBlob: !!blob,
        sourceLanguage,
        targetLanguage
      });
      return;
    }

    try {
      console.log("🎙️ Uploading audio for translation...");
      console.log("🌐 Backend URL:", process.env.NEXT_PUBLIC_BACKEND_URL);
      console.log("🔤 Languages:", { sourceLanguage, targetLanguage });

      const file = new File([blob], "recording.webm", { type: "audio/webm" });
      console.log("📦 File details:", {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const formData = new FormData();
      formData.append("audio", file);
      formData.append("source_language", sourceLanguage);
      formData.append("target_language", targetLanguage);

      console.log("📤 Sending request to proxy endpoint");
      
      const response = await fetch('/api/proxy/translate-audio', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'audio/mpeg',
        },
        credentials: 'include'
      });

      console.log("📥 Received response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Translation failed with status:', response.status, errorText);
        throw new Error(`Translation failed: ${response.status} ${errorText}`);
      }

      // Decode texts from headers
      const sourceTextBase64 = response.headers.get("source-text-base64");
      const translatedTextBase64 = response.headers.get("translated-text-base64");

      if (sourceTextBase64 && translatedTextBase64) {
        const decodedSource = atob(sourceTextBase64);
        const decodedTranslated = atob(translatedTextBase64);
        console.log("📜 Original:", decodedSource);
        console.log("🌎 Translated:", decodedTranslated);
        setTranslation(decodedTranslated);
      } else {
        console.warn("⚠️ No translation metadata received in headers");
        setTranslation('');
      }

      const audioBlob = await response.blob();
      console.log("🔊 Received audio blob:", {
        size: audioBlob.size,
        type: audioBlob.type
      });

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Received empty audio blob');
      }

      const audioUrl = URL.createObjectURL(audioBlob);

      // Cleanup old audio
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
      setError(err.message || 'Unknown error occurred');
    }
  }, [sourceLanguage, targetLanguage]);

  const testUpload = useCallback(async (blob) => {
    if (!blob || !sourceLanguage || !targetLanguage) {
      console.error('❌ Missing required parameters:', {
        hasBlob: !!blob,
        sourceLanguage,
        targetLanguage
      });
      return;
    }

    try {
      console.log("🧪 Testing file upload...");
      const file = new File([blob], "recording.webm", { type: "audio/webm" });

      const formData = new FormData();
      formData.append("audio", file);
      formData.append("source_language", sourceLanguage);
      formData.append("target_language", targetLanguage);

      const response = await fetch('/api/proxy/translate-audio?test=1', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const result = await response.json();
      console.log("✅ Test upload result:", result);
      return result;
    } catch (err) {
      console.error('❌ Test upload error:', err);
      throw err;
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
    testUpload,
  };
}
