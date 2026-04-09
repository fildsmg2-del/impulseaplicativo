import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Loader2, FolderKanban, User, Calendar, ArrowRight, Search, Filter } from 'lucide-react';
import { projectService } from '@/services/projectService';
import { useAuth } from '@/hooks/use-auth';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { calculateProjectProgress } from '@/components/projects/projectStagesConfig';
import { useProjectStages } from '@/hooks/useProjectStages';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

// Mapeamento de setores para roles responsáveis
const STAGE_ROLE_MAP: Record<string, string[]> = {
  'VENDAS': ['VENDEDOR'],
  'FINANCEIRO': ['FINANCEIRO'],
  'COMPRAS': ['COMPRAS'],
  'ENGENHEIRO': ['ENGENHEIRO'],
  'TECNICO': ['TECNICO'],
  'POS_VENDA': ['POS_VENDA'],
};

// Verifica se o projeto está no setor ativo do usuário
const isProjectActiveForRole = (
  projectStatus: string,
  assignedRole: string | undefined,
  userRole: string,
  assignedTo: string | undefined,
  userId: string | undefined,
): boolean => {
  if (userRole === 'TECNICO') {
    return Boolean(userId && assignedTo === userId && projectStatus === 'TECNICO');
  }

  // Se assigned_role bate com o role do usuário, está ativo para ele
  if (assignedRole === userRole) return true;
  
  // Ou se o status está em um setor que o role pode trabalhar
  const stageRoles = STAGE_ROLE_MAP[projectStatus] || [];
  return stageRoles.includes(userRole);
};

// Verifica se o projeto já passou do setor do usuário (concluído para ele)
const isProjectCompletedForRole = (
  projectStatus: string,
  assignedRole: string | undefined,
  userRole: string,
  assignedTo: string | undefined,
  userId: string | undefined,
): boolean => {
  if (userRole === 'TECNICO') {
    return Boolean(userId && assignedTo === userId && projectStatus !== 'TECNICO');
  }

  return !isProjectActiveForRole(projectStatus, assignedRole, userRole, assignedTo, userId);
};

export default function MyArea() {
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('em_execucao');
  const { stages, template } = useProjectStages();

  const userRole = user?.role || 'VENDEDOR';
  const userId = user?.id;

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const allProjects = await projectService.getAll();
      
      // MASTER e DEV veem todos os projetos
      // Outros roles veem projetos que:
      // 1. Estão atualmente no seu setor (em execução)
      // 2. Já passaram pelo seu setor (concluídos para mim)
      let filteredProjects: Project[] = [];
      
      if (hasRole(['MASTER', 'DEV'])) {
        filteredProjects = allProjects;
      } else {
        filteredProjects = allProjects.filter(p => {
          const assignedRole = p.assigned_role;
          const assignedTo = p.assigned_to;
          
          // Projeto está ativo para mim OU já passou pelo meu setor
          return isProjectActiveForRole(p.status, assignedRole, userRole, assignedTo, userId) || 
                 isProjectCompletedForRole(p.status, assignedRole, userRole, assignedTo, userId);
        });
      }

      setProjects(filteredProjects);

      const clientIds = [...new Set(filteredProjects.map(p => p.client_id).filter(Boolean))] as string[];
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds);
        const names: Record<string, string> = {};
        (clientsData || []).forEach(c => { names[c.id] = c.name; });
        setClientNames(names);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [hasRole, userRole, userId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects];

    // Filtrar baseado no status relativo ao role do usuário
    if (hasRole(['MASTER', 'DEV'])) {
      // MASTER/DEV: usar lógica padrão de status do projeto
      if (statusFilter === 'em_execucao') {
        result = result.filter(p => p.status !== 'POS_VENDA');
      } else if (statusFilter === 'concluidos') {
        result = result.filter(p => p.status === 'POS_VENDA');
      }
    } else {
      // Outros roles: "Concluídos" = projetos que passaram pelo meu setor
      if (statusFilter === 'em_execucao') {
        result = result.filter(p => {
          const assignedRole = p.assigned_role;
          const assignedTo = p.assigned_to;
          return isProjectActiveForRole(p.status, assignedRole, userRole, assignedTo, userId);
        });
      } else if (statusFilter === 'concluidos') {
        result = result.filter(p => {
          const assignedRole = p.assigned_role;
          const assignedTo = p.assigned_to;
          return isProjectCompletedForRole(p.status, assignedRole, userRole, assignedTo, userId);
        });
      }
    }

    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => {
        const clientName = p.client_id ? clientNames[p.client_id]?.toLowerCase() : '';
        return clientName.includes(term) || 
               (p.power_kwp?.toString() || '').includes(term);
      });
    }

    // Ordenar: em execução primeiro, depois por data
    result.sort((a, b) => {
      const aCompleted = hasRole(['MASTER', 'DEV']) 
        ? a.status === 'POS_VENDA'
        : isProjectCompletedForRole(
            a.status,
            a.assigned_role,
            userRole,
            a.assigned_to,
            userId,
          );
      const bCompleted = hasRole(['MASTER', 'DEV'])
        ? b.status === 'POS_VENDA'
        : isProjectCompletedForRole(
            b.status,
            b.assigned_role,
            userRole,
            b.assigned_to,
            userId,
          );
      
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [projects, statusFilter, searchTerm, clientNames, userRole, userId, hasRole]);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setModalOpen(true);
  };

  const getStageLabel = (status: string) => {
    const stage = stages.find(s => s.key === status);
    return stage?.label || status;
  };

  const getStageColor = (status: string) => {
    const colors: Record<string, string> = {
      'VENDAS': 'bg-blue-500',
      'FINANCEIRO': 'bg-green-600',
      'COMPRAS': 'bg-purple-500',
      'ENGENHEIRO': 'bg-orange-500',
      'TECNICO': 'bg-yellow-500',
      'POS_VENDA': 'bg-gray-500',
    };
    return colors[status] || 'bg-muted';
  };

  const emExecucaoCount = hasRole(['MASTER', 'DEV'])
    ? projects.filter(p => p.status !== 'POS_VENDA').length
    : projects.filter(p => {
        return isProjectActiveForRole(p.status, p.assigned_role, userRole, p.assigned_to, userId);
      }).length;
  
  const concluidosCount = hasRole(['MASTER', 'DEV'])
    ? projects.filter(p => p.status === 'POS_VENDA').length
    : projects.filter(p =>
        isProjectCompletedForRole(
          p.status,
          p.assigned_role,
          userRole,
          p.assigned_to,
          userId,
        ),
      ).length;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Minha Área</h1>
            <p className="text-muted-foreground">
              Projetos pendentes para você ({userRole})
            </p>
          </div>
          <Badge variant="outline" className="text-impulse-gold border-impulse-gold w-fit">
            {filteredAndSortedProjects.length} projeto(s)
          </Badge>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ToggleGroup 
            type="single" 
            value={statusFilter} 
            onValueChange={(value) => value && setStatusFilter(value)}
            className="border rounded-md"
          >
            <ToggleGroupItem value="em_execucao" className="gap-2 data-[state=on]:bg-impulse-gold data-[state=on]:text-impulse-dark">
              <Filter className="h-4 w-4" />
              Em Execução ({emExecucaoCount})
            </ToggleGroupItem>
            <ToggleGroupItem value="concluidos" className="gap-2 data-[state=on]:bg-impulse-gold data-[state=on]:text-impulse-dark">
              Concluídos ({concluidosCount})
            </ToggleGroupItem>
            <ToggleGroupItem value="todos" className="gap-2 data-[state=on]:bg-impulse-gold data-[state=on]:text-impulse-dark">
              Todos
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-impulse-gold" />
          </div>
        ) : filteredAndSortedProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum projeto encontrado
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Tente buscar com outro termo.' : 'Você não tem projetos nesta categoria.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedProjects.map((project) => {
              const progress = calculateProjectProgress(
                project.checklist || {},
                project.installation_type,
                stages,
                template,
              );
              const clientName = project.client_id ? clientNames[project.client_id] : 'Cliente não vinculado';
              const isCompleted = hasRole(['MASTER', 'DEV'])
                ? project.status === 'POS_VENDA'
                : isProjectCompletedForRole(
                    project.status,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (project as any).assigned_role,
                    userRole,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (project as any).assigned_to as string | undefined,
                    userId,
                  );
              
              return (
                <Card 
                  key={project.id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${isCompleted ? 'opacity-75' : ''}`}
                  onClick={() => handleProjectClick(project)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`${getStageColor(project.status)} text-white shrink-0`}>
                            {getStageLabel(project.status)}
                          </Badge>
                          <span className="font-semibold text-foreground truncate">
                            {project.power_kwp ? `${project.power_kwp} kWp` : 'Projeto Solar'}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="h-4 w-4" />
                            <span className="truncate max-w-[200px]">{clientName}</span>
                          </div>
                          
                          {project.start_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(new Date(project.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progresso */}
                      <div className="flex items-center gap-4 sm:w-48">
                        <div className="flex-1">
                          <Progress value={progress} className="h-2" />
                        </div>
                        <span className="text-sm font-semibold text-impulse-gold w-12 text-right">
                          {progress}%
                        </span>
                      </div>

                      {/* Botão */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProjectClick(project);
                        }}
                      >
                        Abrir
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ProjectModal
        project={selectedProject}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={fetchProjects}
      />
    </>
  );
}
