export const setupPeer = (roomId, socketRef, userId, localStreamRef, onStream, onTranscript, onLanguagePreferences, onAudioMessage) => {
  const peer = new Peer(userId, {
    host: '/',
    port: '3001',
    path: '/peerjs',
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    }
  });

  peer.on('open', (id) => {
    console.log('My peer ID is:', id);
    socketRef.current.emit('join-room', roomId, id);
  });

  peer.on('call', (call) => {
    console.log('Received call from:', call.peer);
    if (localStreamRef.current) {
      call.answer(localStreamRef.current);
      call.on('stream', (remoteStream) => {
        console.log('Received remote stream from:', call.peer);
        onStream(remoteStream, call);
      });
    } else {
      console.error('Cannot answer call: local stream not ready');
    }
  });

  peer.on('connection', (conn) => {
    console.log('Received connection from:', conn.peer);
    conn.on('data', (data) => {
      if (data.type === 'transcript') {
        onTranscript(data.text);
      } else if (data.type === 'language-preferences') {
        onLanguagePreferences(data.preferences);
      } else if (data.type === 'audio-message') {
        onAudioMessage(data);
      }
    });
  });

  return peer;
}; 