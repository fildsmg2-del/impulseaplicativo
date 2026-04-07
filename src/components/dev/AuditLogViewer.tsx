import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogService, AuditLog } from '@/services/auditLogService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Filter, Clock, User, Tag, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function AuditLogViewer() {
  const [limit, setLimit] = useState(50);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: () => auditLogService.getAll(limit),
    staleTime: 60 * 1000,
  });

  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesEntity = filterEntity === 'all' || log.entity_type === filterEntity;
    const matchesSearch = 
      log.entity_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.performer?.name.toLowerCase().includes(search.toLowerCase()) ||
      log.performer?.email.toLowerCase().includes(search.toLowerCase());
    
    return matchesAction && matchesEntity && matchesSearch;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE': return <Badge className="bg-success/10 text-success border-success/20">CRIAR</Badge>;
      case 'UPDATE': return <Badge className="bg-info/10 text-info border-info/20">EDITAR</Badge>;
      case 'DELETE': return <Badge className="bg-destructive/10 text-destructive border-destructive/20">EXCLUIR</Badge>;
      case 'APPROVE': return <Badge className="bg-success text-white">APROVAR</Badge>;
      case 'REJECT': return <Badge className="bg-destructive text-white">REJEITAR</Badge>;
      case 'LOGIN': return <Badge variant="outline">LOGIN</Badge>;
      default: return <Badge variant="secondary">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário ou nome da entidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Ações</SelectItem>
              <SelectItem value="CREATE">CRIAR</SelectItem>
              <SelectItem value="UPDATE">EDITAR</SelectItem>
              <SelectItem value="DELETE">EXCLUIR</SelectItem>
              <SelectItem value="APPROVE">APROVAR</SelectItem>
              <SelectItem value="REJECT">REJEITAR</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Entidades</SelectItem>
              <SelectItem value="CLIENT">CLIENTE</SelectItem>
              <SelectItem value="PROJECT">PROJETO</SelectItem>
              <SelectItem value="QUOTE">ORÇAMENTO</SelectItem>
              <SelectItem value="TRANSACTION">FINANCEIRO</SelectItem>
              <SelectItem value="USER">USUÁRIO</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando logs de auditoria...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum log encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-4 py-3">Data/Hora</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(log.performed_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{log.performer?.name || 'Desconhecido'}</span>
                      <span className="text-xs text-muted-foreground">{log.performer?.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{log.entity_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[250px]">
                    <p className="font-medium truncate">{log.entity_name || '-'}</p>
                    {Object.keys(log.details).length > 0 && (
                       <p className="text-xs text-muted-foreground truncate italic">
                        {JSON.stringify(log.details).substring(0, 100)}
                       </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) }
      </div>
      
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <p>Exibindo {filteredLogs.length} logs (Limite: {limit})</p>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => setLimit(prev => prev + 50)}>
             Carregar mais 50
           </Button>
        </div>
      </div>
    </div>
  );
}
