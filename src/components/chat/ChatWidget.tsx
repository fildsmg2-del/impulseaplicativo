import { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, X, Send, Loader2, Minus, Paperclip, Trash2, 
  HelpCircle, ExternalLink, ShieldCheck, Download, FileText, Image as ImageIcon
} from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { useAuth } from '@/hooks/use-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { storageService } from '@/services/storageService';
import { toast } from 'sonner';

export function ChatWidget() {
  const { messages, loading, isOpen, setIsOpen, sendMessage, clearChat } = useChat();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-support-chat', handleToggle);
    return () => window.removeEventListener('toggle-support-chat', handleToggle);
  }, [setIsOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    const text = message.trim();
    setMessage('');
    await sendMessage(text);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. O limite é 5MB.');
      return;
    }

    setUploading(true);
    try {
      const folder = `support-chat/${user.id}`;
      const { url } = await storageService.upload(file, folder);
      
      const fileType = file.type.startsWith('image/') ? 'image' : 'document';
      await sendMessage(`Arquivo enviado: ${file.name}`, url, fileType);
      
      toast.success('Arquivo enviado com sucesso');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderMessageContent = (msg: any) => {
    if (msg.file_url) {
      const isImage = msg.file_type === 'image';
      return (
        <div className="space-y-2">
          {isImage ? (
            <div className="rounded-lg overflow-hidden border border-border/50">
              <img 
                src={msg.file_url} 
                alt="Upload" 
                className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(msg.file_url, '_blank')}
              />
            </div>
          ) : (
            <a 
              href={msg.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors border border-border/50"
            >
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium truncate max-w-[150px]">Ver documento</span>
              <Download className="h-3 w-3 ml-auto opacity-50" />
            </a>
          )}
          <p className="text-sm">{msg.message}</p>
        </div>
      );
    }
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>;
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-16 right-0 w-[380px] h-[550px] bg-card rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden backdrop-blur-sm"
          >
            {/* Header */}
            <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Suporte Impulse</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] opacity-80 font-medium uppercase tracking-wider">Online agora</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button 
                  onClick={clearChat}
                  title="Limpar conversa"
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-muted/30 to-background"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs font-medium">Sincronizando mensagens...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                    <HelpCircle className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Como podemos ajudar?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Envie sua dúvida abaixo. Nossa equipe de desenvolvimento responderá o mais breve possível diretamente por aqui.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pb-2">
                  <div className="flex justify-center flex-shrink-0">
                    <span className="px-3 py-1 rounded-full bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border/50">
                      Início do chat
                    </span>
                  </div>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: msg.is_from_dev ? -10 : 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        msg.is_from_dev ? "self-start" : "self-end items-end"
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-2xl shadow-sm border",
                        msg.is_from_dev 
                          ? "bg-card border-border text-foreground rounded-tl-sm" 
                          : "bg-primary text-primary-foreground border-primary/20 rounded-tr-sm"
                      )}>
                        {renderMessageContent(msg)}
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1 mt-1 font-medium italic opacity-70">
                        {format(new Date(msg.created_at), "HH:mm '•' d 'de' MMM", { locale: ptBR })}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2 bg-muted/50 rounded-2xl p-2 border border-border/50 group focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-2.5 hover:bg-primary/10 rounded-xl transition-all text-muted-foreground hover:text-primary active:scale-95 disabled:opacity-50"
                  title="Anexar arquivo"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Digite sua dúvida aqui..."
                  className="flex-1 bg-transparent px-1 py-2 text-sm focus:outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || uploading}
                  className="p-2.5 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5 opacity-40">
                <span className="text-[8px] font-bold uppercase tracking-[2px]">Impulse System Support</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-500",
          isOpen 
            ? "bg-muted text-foreground rotate-90 border border-border" 
            : "bg-primary text-primary-foreground shadow-primary/20 border-2 border-primary-foreground/10"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
        {!isOpen && messages.some(m => m.is_from_dev) && (
          <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full border-2 border-background flex items-center justify-center animate-bounce">
            <span className="text-[10px] font-bold text-white">!</span>
          </div>
        )}
      </motion.button>
    </div>
  );
}
