import React, { useEffect, useRef } from 'react';

const VideoContainer = ({ label, stream, isLocal, className }) => {
  const videoRef = useRef(null);

  // Handle video stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log(`Setting video stream for ${label}`);
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error(`Error playing video for ${label}:`, err);
      });
    }
  }, [stream, label]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        console.log(`Cleaning up video stream for ${label}`);
        videoRef.current.srcObject = null;
        videoRef.current.load();
      }
    };
  }, [label]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover rounded-lg"
        style={{ transform: 'scaleX(-1)' }} // Flip all videos
      />
    </div>
  );
};

export default VideoContainer; 