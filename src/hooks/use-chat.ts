import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { devChatService, DevChatMessage } from '@/services/devChatService';
import { toast } from 'sonner';

export function useChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DevChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user?.id || !isOpen) return;

    const loadMessages = async () => {
      try {
        const msgs = await devChatService.getMessages(user.id);
        setMessages(msgs);
      } catch (error) {
        console.error('Error loading chat messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Subscribe to new messages
    const unsubscribe = devChatService.subscribe(user.id, (newMsg) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, isOpen]);

  const sendMessage = async (text: string, fileUrl?: string, fileType?: string) => {
    if (!user?.id) return;

    try {
      // Send to Supabase (which triggers the Edge Function to Telegram)
      await devChatService.sendMessage(
        user.id,
        user.name || 'Usuário',
        text,
        undefined,
        fileUrl,
        fileType
      );
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const clearChat = async () => {
    if (!user?.id) return;
    try {
      await devChatService.clearMessages(user.id);
      setMessages([]);
      toast.success('Conversa limpa com sucesso');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Erro ao limpar conversa');
    }
  };

  return {
    messages,
    loading,
    isOpen,
    setIsOpen,
    sendMessage,
    clearChat
  };
}
