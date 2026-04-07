import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRecentProjects, RecentProject } from '@/services/dashboardService';

const statusLabels: Record<string, string> = {
  VENDAS: 'VENDAS',
  FINANCEIRO: 'FINANCEIRO',
  COMPRAS: 'COMPRAS',
  ENGENHEIRO: 'ENGENHEIRO',
  TECNICO: 'TECNICO',
  POS_VENDA: 'PÓS VENDA',
};

export function RecentProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await getRecentProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 shadow-impulse animate-fade-in h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-impulse-gold" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-impulse animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Projetos em Andamento
          </h3>
          <p className="text-sm text-muted-foreground">
            Acompanhamento dos projetos ativos
          </p>
        </div>
        <button 
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1 text-sm font-medium text-impulse-gold hover:underline"
        >
          Ver todos <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum projeto em andamento
          </p>
        ) : (
          projects.map((project, i) => (
            <div
              key={project.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors animate-slide-in-left"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Status Icon */}
              <div
                className={cn(
                  'p-2 rounded-lg',
                  project.progress === 100
                    ? 'bg-success/10 text-success'
                    : 'bg-impulse-gold/10 text-impulse-gold'
                )}
              >
                {project.progress === 100 ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {project.clientName}
                </p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{project.power.toFixed(1)} kWp</span>
                  <span>•</span>
                  <span>{statusLabels[project.status] || project.status}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="w-24 hidden sm:block">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium text-foreground">
                    {project.progress}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-impulse-gold"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
