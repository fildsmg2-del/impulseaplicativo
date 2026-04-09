import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Quote, quoteService } from '@/services/quoteService';
import { clientService, Client } from '@/services/clientService';
import { getUsers } from '@/services/userService';
import { QuoteKanban } from '@/components/quotes/QuoteKanban';

export default function Funnel() {
  const [search, setSearch] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [quotesData, clientsData] = await Promise.all([
        quoteService.getAll(),
        clientService.getAll(),
      ]);
      
      let usersData: Awaited<ReturnType<typeof getUsers>> = [];
      try {
        usersData = await getUsers();
      } catch (err) {
        console.error('Error loading users:', err);
      }
      
      setQuotes(quotesData);
      const clientsMap: Record<string, Client> = {};
      clientsData.forEach((client) => {
        clientsMap[client.id] = client;
      });
      setClients(clientsMap);
      
      const creatorMap: Record<string, string> = {};
      if (usersData && Array.isArray(usersData)) {
        usersData.forEach((user) => {
          if (user?.id && user?.name) {
            creatorMap[user.id] = user.name;
          }
        });
      }
      setCreatorNames(creatorMap);
    } catch (error) {
      console.error('Error loading funnel data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clientNames = useMemo(() => {
    const names: Record<string, string> = {};
    Object.values(clients).forEach((client) => {
      names[client.id] = client.name;
    });
    return names;
  }, [clients]);

  const filteredQuotes = quotes.filter((quote) => {
    if (!search.trim()) return true;
    const clientName = quote.client_id ? clientNames[quote.client_id] : '';
    return clientName?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Funil</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o andamento dos orçamentos por etapa
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar orçamento por cliente..."
            className="w-full pl-12 pr-4 py-3 bg-card rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-impulse-gold focus:border-transparent transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando funil...</p>
        </div>
      ) : (
        <div className="animate-fade-in">
          <QuoteKanban
            quotes={filteredQuotes}
            clientNames={clientNames}
            creatorNames={creatorNames}
            onQuoteUpdate={loadData}
          />
          {filteredQuotes.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <p className="text-muted-foreground">Nenhum orçamento encontrado.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
