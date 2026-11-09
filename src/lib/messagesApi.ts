import { supabase } from "./supabase";

export interface ConversationSummary {
  other_id: string;
  username: string;
  display_name: string;
  last_body: string;
  last_at: string;
  unread: number;
}

export interface MessageItem {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string): void {
  if (!UUID_PATTERN.test(value)) throw new Error("invalid_target");
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc("list_conversations");
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.map((row) => ({
    other_id: String(row.other_id),
    username: String(row.username ?? ""),
    display_name: String(row.display_name ?? ""),
    last_body: String(row.last_body ?? ""),
    last_at: String(row.last_at),
    unread: Number(row.unread ?? 0),
  }));
}

export async function listMessages(myId: string, otherId: string): Promise<MessageItem[]> {
  assertUuid(myId);
  assertUuid(otherId);
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(
      `and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`
    )
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as MessageItem[];
}

export async function sendMessage(recipientId: string, body: string): Promise<void> {
  assertUuid(recipientId);
  const { error } = await supabase.rpc("send_message", {
    p_recipient: recipientId,
    p_body: body,
  });
  if (error) throw error;
}

export async function markConversationRead(otherId: string): Promise<void> {
  assertUuid(otherId);
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherId)
    .is("read_at", null);
  if (error) throw error;
}
