import firestore from '@react-native-firebase/firestore';

const callsCollection = () => firestore().collection('calls');

export async function createCallDocument(
  callId: string,
  callerId: string,
  calleeId: string,
  offer: RTCSessionDescriptionInit,
): Promise<void> {
  await callsCollection().doc(callId).set({
    offer,
    callerId,
    calleeId,
    status: 'ringing',
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function setAnswer(callId: string, answer: RTCSessionDescriptionInit): Promise<void> {
  await callsCollection().doc(callId).update({ answer, status: 'active' });
}

export async function addCallerCandidate(callId: string, candidate: RTCIceCandidateInit): Promise<void> {
  await callsCollection().doc(callId).collection('callerCandidates').add({ candidate });
}

export async function addCalleeCandidate(callId: string, candidate: RTCIceCandidateInit): Promise<void> {
  await callsCollection().doc(callId).collection('calleeCandidates').add({ candidate });
}

export function subscribeToCallDocument(
  callId: string,
  onUpdate: (data: any) => void,
): () => void {
  return callsCollection().doc(callId).onSnapshot((snap) => {
    if (snap.exists) onUpdate(snap.data());
  });
}

export function subscribeToCalleeCandidates(
  callId: string,
  onCandidate: (candidate: RTCIceCandidateInit) => void,
): () => void {
  return callsCollection()
    .doc(callId)
    .collection('calleeCandidates')
    .onSnapshot((snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') onCandidate(change.doc.data().candidate);
      });
    });
}

export function subscribeToCallerCandidates(
  callId: string,
  onCandidate: (candidate: RTCIceCandidateInit) => void,
): () => void {
  return callsCollection()
    .doc(callId)
    .collection('callerCandidates')
    .onSnapshot((snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') onCandidate(change.doc.data().candidate);
      });
    });
}

export async function endCall(callId: string): Promise<void> {
  await callsCollection().doc(callId).update({ status: 'ended' });
}
