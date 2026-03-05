import { supabase } from './supabase';

export async function createCallDocument(
  callId: string,
  callerId: string,
  calleeId: string,
  offer: RTCSessionDescriptionInit,
): Promise<void> {
  await supabase.from('calls').upsert({
    id: callId,
    caller_id: callerId,
    callee_id: calleeId,
    offer,
    status: 'ringing',
  });
}

export async function setAnswer(callId: string, answer: RTCSessionDescriptionInit): Promise<void> {
  await supabase.from('calls').update({ answer, status: 'active' }).eq('id', callId);
}

export async function addCallerCandidate(callId: string, candidate: RTCIceCandidateInit): Promise<void> {
  const channel = supabase.channel(`call-candidates:${callId}`);
  await channel.send({ type: 'broadcast', event: 'caller-candidate', payload: { candidate } });
}

export async function addCalleeCandidate(callId: string, candidate: RTCIceCandidateInit): Promise<void> {
  const channel = supabase.channel(`call-candidates:${callId}`);
  await channel.send({ type: 'broadcast', event: 'callee-candidate', payload: { candidate } });
}

export function subscribeToCallDocument(
  callId: string,
  onUpdate: (data: any) => void,
): () => void {
  const channel = supabase
    .channel(`call-doc:${callId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'calls', filter: `id=eq.${callId}` },
      (payload) => onUpdate(payload.new),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToCalleeCandidates(
  callId: string,
  onCandidate: (candidate: RTCIceCandidateInit) => void,
): () => void {
  const channel = supabase
    .channel(`call-candidates:${callId}`)
    .on('broadcast', { event: 'callee-candidate' }, ({ payload }) => {
      onCandidate(payload.candidate);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToCallerCandidates(
  callId: string,
  onCandidate: (candidate: RTCIceCandidateInit) => void,
): () => void {
  const channel = supabase
    .channel(`call-candidates:${callId}`)
    .on('broadcast', { event: 'caller-candidate' }, ({ payload }) => {
      onCandidate(payload.candidate);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export async function endCall(callId: string): Promise<void> {
  await supabase.from('calls').update({ status: 'ended' }).eq('id', callId);
}
