import { useState, useEffect, useCallback } from 'react';

export default function useSpeechRecognition(sourceLanguage = 'en') {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);

  // Initialize speech recognition
  const recognition = typeof window !== 'undefined' 
    ? new (window.SpeechRecognition || window.webkitSpeechRecognition)() 
    : null;

  useEffect(() => {
    if (!recognition) return;

    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Map language codes to Web Speech API language codes
    const languageMap = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'de': 'de-DE'
    };
    
    recognition.lang = languageMap[sourceLanguage] || 'en-US';

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      
      setTranscript(transcriptText);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [recognition, isListening, sourceLanguage]);

  const startListening = useCallback(() => {
    if (!recognition) return;
    
    try {
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch (err) {
      console.error('Failed to start listening:', err);
      setError(err.message);
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    
    recognition.stop();
    setIsListening(false);
  }, [recognition]);

  return {
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
  };
} 