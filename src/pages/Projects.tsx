import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, X, LayoutGrid, List, Calendar, Trash2, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project, projectService, ProjectStatus } from '@/services/projectService';
import { supabase } from '@/integrations/supabase/client';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { ProjectKanban } from '@/components/projects/ProjectKanban';
import { ProjectGantt } from '@/components/projects/ProjectGantt';
import { calculateProjectProgress, getStageByKey } from '@/components/projects/projectStagesConfig';
import { useProjectStages } from '@/hooks/useProjectStages';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type ViewMode = 'list' | 'kanban' | 'gantt';

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole } = useAuth();
  const canDeleteProject = hasRole(['MASTER', 'DEV']);
  const canOpenProjectModal = !hasRole(['TECNICO']);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<ProjectStatus | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showArchived, setShowArchived] = useState(false);
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>();
  const { stages, template } = useProjectStages();

  const fetchProjects = async () => {
    try {
      const data = await projectService.getAll();
      setProjects(data);

      // Fetch client names
      const clientIds = [...new Set(data.filter((p) => p.client_id).map((p) => p.client_id!))];
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
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Check for new project with client or project ID in URL
  useEffect(() => {
    const projectId = searchParams.get('id');
    const isNew = searchParams.get('new') === 'true';
    const clientId = searchParams.get('client_id');
    
    if (isNew && clientId && canOpenProjectModal) {
      setPreselectedClientId(clientId);
      setSelectedProject(null);
      setModalOpen(true);
      setSearchParams({});
    } else if (projectId && !loading && projects.length > 0 && canOpenProjectModal) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        setModalOpen(true);
        setSearchParams({});
      }
    }
  }, [searchParams, loading, projects, canOpenProjectModal, setSearchParams]);

  const filteredProjects = projects.filter((project) => {
    const clientName = project.client_id ? clientNames[project.client_id] || '' : '';
    const matchesSearch = clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStage = !stageFilter || project.status === stageFilter;
    
    // Calculate progress to determine if it's archived (100%)
    const progress = calculateProjectProgress(
      project.checklist,
      project.installation_type,
      stages,
      template,
    );
    const isArchived = progress === 100;

    // By default, hide archived projects unless explicitly filtering by a stage or showArchived is on
    if (!showArchived && isArchived && !stageFilter) return false;

    return matchesSearch && matchesStage;
  });

  const { paginatedItems, ...paginationProps } = usePagination({
    items: filteredProjects,
    itemsPerPage: 6,
  });

  const handleStageClick = (stageKey: ProjectStatus) => {
    if (stageFilter === stageKey) {
      setStageFilter(null);
    } else {
      setStageFilter(stageKey);
    }
  };

  const handleProjectClick = (project: Project) => {
    if (!canOpenProjectModal) {
      return;
    }
    setSelectedProject(project);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedProject(null);
    setPreselectedClientId(undefined);
  };

  const handleSave = () => {
    fetchProjects();
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    try {
      await projectService.delete(projectId);
      toast.success('Projeto excluído com sucesso!');
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Erro ao excluir projeto.');
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projetos</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o andamento das instalações
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1 flex-1 sm:flex-none">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3 flex-1"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-8 px-3 flex-1"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'gantt' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('gantt')}
              className="h-8 px-3 flex-1"
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant={showArchived ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="h-10 rounded-xl gap-2 flex-1 sm:flex-none"
          >
            <FolderKanban className="h-4 w-4" />
            <span className="truncate">{showArchived ? "Ocultar Concluídos" : "Ver Concluídos"}</span>
          </Button>
        </div>
      </div>

      {/* Stage Pipeline - Only show in list mode */}
      {viewMode === 'list' && (
        <>
          <div className="mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex overflow-x-auto gap-2 pb-2">
              {stages.map((stage) => {
                const count = projects.filter((p) => p.status === stage.key).length;
                const isActive = stageFilter === stage.key;
                return (
                  <button
                    key={stage.key}
                    onClick={() => handleStageClick(stage.key as ProjectStatus)}
                    className={cn(
                      'flex-shrink-0 px-4 py-3 rounded-xl border min-w-[140px] text-left transition-all',
                      isActive
                        ? 'bg-impulse-gold/10 border-impulse-gold'
                        : 'bg-card border-border hover:border-impulse-gold/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('w-2 h-2 rounded-full', stage.color)} />
                      <span className="text-xs font-medium text-muted-foreground">
                        Setor
                      </span>
                    </div>
                    <p className="font-semibold text-foreground">{stage.label}</p>
                    <p className="text-sm text-muted-foreground">{count} projetos</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filter Indicator */}
          {stageFilter && (
            <div className="flex items-center gap-2 mb-4 animate-fade-in">
              <span className="text-sm text-muted-foreground">Filtrando por:</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStageFilter(null)}
                className="h-7 text-xs"
              >
                {stages.find((s) => s.key === stageFilter)?.label}
                <X className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Search - Show for list and kanban */}
      {viewMode !== 'gantt' && (
        <div className="flex gap-4 mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar projeto por cliente..."
              className="w-full pl-12 pr-4 py-3 bg-card rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-impulse-gold focus:border-transparent transition-all"
            />
          </div>
        </div>
      )}

      {/* Content based on view mode */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando projetos...</p>
        </div>
      ) : (
        <>
          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <div className="animate-fade-in">
              <ProjectKanban
                projects={filteredProjects}
                clientNames={clientNames}
                onProjectClick={handleProjectClick}
                onProjectUpdate={fetchProjects}
              />
            </div>
          )}

          {/* Gantt View */}
          {viewMode === 'gantt' && (
            <div className="animate-fade-in">
              <ProjectGantt
                projects={projects}
                clientNames={clientNames}
                onProjectClick={handleProjectClick}
              />
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <>
              <div className="space-y-4">
                {paginatedItems.map((project, i) => {
                  const stage = getStageByKey(project.status, stages) || stages[0] || { color: 'bg-muted', label: 'Carregando...' };
                  const progress = calculateProjectProgress(
                    project.checklist || {},
                    project.installation_type,
                    stages,
                    template,
                  );
                  const clientName = project.client_id ? clientNames[project.client_id] : 'Cliente não vinculado';

                  return (
                    <div
                      key={project.id}
                      onClick={() => handleProjectClick(project)}
                      className="bg-card rounded-2xl border border-border p-6 shadow-impulse animate-fade-in cursor-pointer hover:border-impulse-gold/50 transition-all"
                      style={{ animationDelay: `${(i + 3) * 100}ms` }}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-foreground">
                              {clientName}
                            </h3>
                            <span
                              className={cn(
                                'px-3 py-1 rounded-full text-xs font-medium text-primary-foreground',
                                stage.color
                              )}
                            >
                              {stage.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {project.power_kwp ? `${project.power_kwp} kWp • ` : ''}
                            {project.start_date
                              ? `Início: ${new Date(project.start_date).toLocaleDateString('pt-BR')}`
                              : 'Sem data de início'}
                            {project.estimated_end_date &&
                              ` • Previsão: ${new Date(project.estimated_end_date).toLocaleDateString('pt-BR')}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">{progress}%</p>
                          <p className="text-sm text-muted-foreground">concluído</p>
                        </div>
                      </div>

                      {/* Progresso geral */}
                      <div className="relative">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-2 rounded-full transition-all', stage.color)}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-muted-foreground">0%</span>
                          <span className="text-xs text-muted-foreground">100%</span>
                        </div>
                      </div>

                      {/* Delete Button */}
                      {canDeleteProject && (
                        <div className="flex justify-end mt-4 pt-4 border-t border-border">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                                Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => handleDeleteProject(e, project.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredProjects.length === 0 && (
                <div className="text-center py-12 animate-fade-in">
                  <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
                </div>
              )}

              {filteredProjects.length > 0 && (
                <div className="mt-6">
                  <PaginationControls {...paginationProps} />
                </div>
              )}
            </>
          )}
        </>
      )}

      <ProjectModal
        project={selectedProject}
        open={modalOpen}
        onOpenChange={handleModalClose}
        onSave={handleSave}
        preselectedClientId={preselectedClientId}
      />
    </>
  );
}
