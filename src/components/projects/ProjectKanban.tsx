import { useState } from 'react';
import { Project, ProjectStatus, projectService } from '@/services/projectService';
import { calculateProjectProgress } from './projectStagesConfig';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { GripVertical, User, Zap, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStages } from '@/hooks/useProjectStages';

interface ProjectKanbanProps {
  projects: Project[];
  clientNames: Record<string, string>;
  onProjectClick: (project: Project) => void;
  onProjectUpdate: () => void;
}

export function ProjectKanban({ projects, clientNames, onProjectClick, onProjectUpdate }: ProjectKanbanProps) {
  const { user, hasRole } = useAuth();
  const isMaster = hasRole(['MASTER']);
  const { stages, template } = useProjectStages();
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, project: Project) => {
    if (!isMaster && project.created_by !== user?.id) {
      toast.error('Apenas o criador ou MASTER pode mover o card.');
      return;
    }

    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageKey);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (draggedProject && !isMaster && draggedProject.created_by !== user?.id) {
      toast.error('Apenas o criador ou MASTER pode mover o card.');
      setDraggedProject(null);
      return;
    }

    if (!draggedProject || draggedProject.status === stageKey) {
      setDraggedProject(null);
      return;
    }

    try {
      await projectService.updateStatus(draggedProject.id, stageKey as ProjectStatus);
      toast.success(`Projeto movido para ${stages.find(s => s.key === stageKey)?.label}`);
      onProjectUpdate();
    } catch (error) {
      console.error('Error updating project status:', error);
      toast.error('Erro ao mover projeto');
    } finally {
      setDraggedProject(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageProjects = projects.filter(p => p.status === stage.key);
        const isDropTarget = dragOverStage === stage.key;
        
        return (
          <div
            key={stage.key}
            className={cn(
              'flex-shrink-0 w-[280px] rounded-xl border transition-all duration-200',
              isDropTarget 
                ? 'bg-impulse-gold/10 border-impulse-gold border-dashed' 
                : 'bg-card border-border'
            )}
            onDragOver={(e) => handleDragOver(e, stage.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            {/* Column Header */}
            <div className={cn('p-3 rounded-t-xl', stage.color)}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-primary-foreground text-sm">{stage.label}</h3>
                <span className="bg-white/20 text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {stageProjects.length}
                </span>
              </div>
            </div>

            {/* Cards Container */}
            <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-350px)] overflow-y-auto">
              {stageProjects.map((project) => {
                const clientName = project.client_id ? clientNames[project.client_id] : 'Cliente não vinculado';
                const progress = calculateProjectProgress(
                  project.checklist,
                  project.installation_type,
                  stages,
                  template,
                );
                const isDragging = draggedProject?.id === project.id;
                const canMoveProject = isMaster || project.created_by === user?.id;

                return (
                  <div
                    key={project.id}
                    draggable={canMoveProject}
                    onDragStart={(e) => handleDragStart(e, project)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onProjectClick(project)}
                    className={cn(
                      'bg-background rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing hover:border-impulse-gold/50 transition-all group',
                      isDragging && 'opacity-50 scale-95'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="font-medium text-sm text-foreground truncate">{clientName}</p>
                        </div>
                        
                        {project.power_kwp && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <Zap className="h-3 w-3 text-impulse-gold" />
                            {project.power_kwp} kWp
                          </div>
                        )}

                        {project.estimated_end_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.estimated_end_date).toLocaleDateString('pt-BR')}
                          </div>
                        )}

                        {/* Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                          <div
                            className={cn('h-1.5 rounded-full transition-all', stage.color)}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 text-right">{progress}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {stageProjects.length === 0 && (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-xs">
                  Arraste projetos aqui
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
