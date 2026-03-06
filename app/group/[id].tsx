import { ChatView } from "@/components/chat";
import { sendGroupMessage, subscribeToGroupMessages } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import type { AppDispatch, RootState } from "@/store";
import { selectMessages } from "@/store/slices/chat-slice";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function GroupChatScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const messages = useSelector((state: RootState) =>
    selectMessages(state, groupId),
  );
  const [groupName, setGroupName] = useState("Group");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from("groups")
      .select("name")
      .eq("id", groupId)
      .single()
      .then(({ data }) => {
        if (data?.name) setGroupName(data.name);
      });
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    return subscribeToGroupMessages(groupId, dispatch, () => setIsLoading(false));
  }, [groupId, dispatch]);

  const handleSend = useCallback(
    (text: string) => {
      if (!uid) return;
      sendGroupMessage(groupId, uid, text);
    },
    [uid, groupId],
  );

  return (
    <ChatView
      title={groupName}
      messages={messages}
      currentUid={uid}
      onSend={handleSend}
      isLoading={isLoading}
    />
  );
}
