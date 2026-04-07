import { useState } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ text: string; sent: boolean }[]>([
    { text: 'Olá! Como posso ajudar?', sent: false },
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages([...messages, { text: message, sent: true }]);
    setMessage('');
    // Simulate response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { text: 'Obrigado pela mensagem! Em breve retornaremos.', sent: false },
      ]);
    }, 1000);
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 p-4 rounded-full gradient-gold shadow-gold animate-pulse-gold transition-all hover:scale-110',
          isOpen && 'hidden'
        )}
      >
        <MessageCircle className="h-6 w-6 text-impulse-dark" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 w-80 md:w-96 bg-card rounded-2xl shadow-impulse border border-border overflow-hidden transition-all duration-300',
          isOpen
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="gradient-impulse px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-impulse-gold rounded-full animate-pulse" />
            <span className="text-primary-foreground font-medium">Chat Interno</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-sidebar-accent rounded transition-colors"
            >
              <Minimize2 className="h-4 w-4 text-primary-foreground" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-sidebar-accent rounded transition-colors"
            >
              <X className="h-4 w-4 text-primary-foreground" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="h-72 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[80%] px-4 py-2 rounded-2xl text-sm animate-fade-in',
                msg.sent
                  ? 'ml-auto bg-primary text-primary-foreground rounded-br-sm'
                  : 'mr-auto bg-card border border-border rounded-bl-sm'
              )}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border bg-card">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-2 bg-muted rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-impulse-gold"
            />
            <button
              onClick={handleSend}
              className="p-2 gradient-gold rounded-full hover:scale-105 transition-transform"
            >
              <Send className="h-4 w-4 text-impulse-dark" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
