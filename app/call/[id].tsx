import { useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { RTCView } from 'react-native-webrtc';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useWebRTC } from '@/hooks';
import { CallControls } from '@/components/call';

export default function CallScreen() {
  const { id: callId } = useLocalSearchParams<{ id: string }>();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const {
    localStream,
    remoteStream,
    callStatus,
    isMuted,
    isCameraOff,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useWebRTC(callId, uid ?? '');

  useEffect(() => {
    if (uid) startCall();
    return () => { endCall(); };
  }, []);

  const handleEndCall = useCallback(() => {
    endCall();
    router.back();
  }, [endCall]);

  return (
    <View style={styles.container}>
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteStream}
          objectFit="cover"
          mirror={false}
        />
      ) : (
        <View style={styles.waitingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.waitingText}>
            {callStatus === 'ringing' ? 'Ringing...' : 'Connecting...'}
          </Text>
        </View>
      )}

      {localStream && (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.localStream}
          objectFit="cover"
          mirror
        />
      )}

      <CallControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onEndCall={handleEndCall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  remoteStream: { ...StyleSheet.absoluteFillObject },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  waitingText: { color: '#fff', fontSize: 18 },
  localStream: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
});
