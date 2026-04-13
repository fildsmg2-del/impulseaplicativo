import { supabase } from '@/integrations/supabase/client';

export interface DevChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
  telegram_message_id?: number;
  is_from_dev: boolean;
  file_url?: string;
  file_type?: string;
}

export const devChatService = {
  async getMessages(userId: string): Promise<DevChatMessage[]> {
    const { data, error } = await supabase
      .from('dev_chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as DevChatMessage[];
  },

  async sendMessage(userId: string, userName: string, message: string, telegram_message_id?: number, fileUrl?: string, fileType?: string) {
    const { data, error } = await supabase
      .from('dev_chat_messages')
      .insert({
        user_id: userId,
        user_name: userName,
        message,
        telegram_message_id,
        is_from_dev: false,
        file_url: fileUrl,
        file_type: fileType
      })
      .select()
      .single();

    if (error) throw error;
    return data as DevChatMessage;
  },

  async clearMessages(userId: string) {
    const { error } = await supabase
      .from('dev_chat_messages')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  },

  subscribe(userId: string, onMessage: (msg: DevChatMessage) => void) {
    const channel = supabase
      .channel(`support-chat-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dev_chat_messages',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onMessage(payload.new as DevChatMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
