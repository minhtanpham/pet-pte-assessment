import { useState, useCallback, useRef } from 'react';
import { MediaStream } from 'react-native-webrtc';
import {
  createPeerConnection,
  getUserMedia,
  createOffer,
  createAnswer,
  setRemoteDescription,
  addIceCandidate,
} from '@/lib/webrtc';
import {
  createCallDocument,
  setAnswer,
  addCallerCandidate,
  addCalleeCandidate,
  subscribeToCallDocument,
  subscribeToCalleeCandidates,
  subscribeToCallerCandidates,
  endCall as endCallSignaling,
} from '@/lib/signaling';

type CallStatus = 'idle' | 'ringing' | 'active' | 'ended';

export function useWebRTC(callId: string, uid: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const pcRef = useRef<any>(null);
  const unsubscribesRef = useRef<Array<() => void>>([]);

  const cleanup = useCallback(() => {
    unsubscribesRef.current.forEach((fn) => fn());
    unsubscribesRef.current = [];
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    localStream?.getTracks().forEach((t: any) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('ended');
  }, [localStream]);

  const startCall = useCallback(async () => {
    try {
      const stream = await getUserMedia();
      setLocalStream(stream);

      const pc = createPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

      pc.ontrack = (event: any) => {
        if (event.streams?.[0]) setRemoteStream(event.streams[0]);
      };

      const remoteStream = new MediaStream(undefined);
      pc.ontrack = (event: any) => {
        event.streams[0].getTracks().forEach((t: any) => remoteStream.addTrack(t));
        setRemoteStream(remoteStream);
      };

      pc.onicecandidate = async (event: any) => {
        if (event.candidate) {
          await addCallerCandidate(callId, event.candidate.toJSON());
        }
      };

      const offer = await createOffer(pc);
      await createCallDocument(callId, uid, '', offer);
      setCallStatus('ringing');

      // Listen for answer
      const unsub1 = subscribeToCallDocument(callId, async (data) => {
        if (data?.answer && pc.signalingState !== 'stable') {
          await setRemoteDescription(pc, data.answer);
        }
        if (data?.status === 'active') setCallStatus('active');
        if (data?.status === 'ended') { cleanup(); }
      });

      // Listen for callee ICE candidates
      const unsub2 = subscribeToCalleeCandidates(callId, async (candidate) => {
        if (pcRef.current) await addIceCandidate(pcRef.current, candidate);
      });

      unsubscribesRef.current = [unsub1, unsub2];
    } catch (err) {
      console.error('startCall error', err);
      cleanup();
    }
  }, [callId, uid, cleanup]);

  const joinCall = useCallback(async () => {
    try {
      const stream = await getUserMedia();
      setLocalStream(stream);

      const pc = createPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

      const remoteStream = new MediaStream(undefined);
      pc.ontrack = (event: any) => {
        event.streams[0].getTracks().forEach((t: any) => remoteStream.addTrack(t));
        setRemoteStream(remoteStream);
      };

      pc.onicecandidate = async (event: any) => {
        if (event.candidate) {
          await addCalleeCandidate(callId, event.candidate.toJSON());
        }
      };

      const unsub1 = subscribeToCallDocument(callId, async (data) => {
        if (data?.offer && pc.signalingState === 'stable') {
          await setRemoteDescription(pc, data.offer);
          const answer = await createAnswer(pc);
          await setAnswer(callId, answer);
          setCallStatus('active');
        }
        if (data?.status === 'ended') cleanup();
      });

      const unsub2 = subscribeToCallerCandidates(callId, async (candidate) => {
        if (pcRef.current) await addIceCandidate(pcRef.current, candidate);
      });

      unsubscribesRef.current = [unsub1, unsub2];
    } catch (err) {
      console.error('joinCall error', err);
      cleanup();
    }
  }, [callId, cleanup]);

  const endCall = useCallback(async () => {
    await endCallSignaling(callId).catch(() => {});
    cleanup();
  }, [callId, cleanup]);

  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach((t: any) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach((t: any) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((prev) => !prev);
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    callStatus,
    isMuted,
    isCameraOff,
    startCall,
    joinCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
