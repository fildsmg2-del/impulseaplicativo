import { useMemo } from 'react';
import { Project } from '@/services/projectService';
import { getStageByKey } from './projectStagesConfig';
import { cn } from '@/lib/utils';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useProjectStages } from '@/hooks/useProjectStages';

interface ProjectGanttProps {
  projects: Project[];
  clientNames: Record<string, string>;
  onProjectClick: (project: Project) => void;
}

export function ProjectGantt({ projects, clientNames, onProjectClick }: ProjectGanttProps) {
  const { stages } = useProjectStages();
  const { days, monthStart, monthEnd } = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(addDays(now, 60)); // Show 2 months ahead
    const daysArray = eachDayOfInterval({ start, end });
    return { days: daysArray, monthStart: start, monthEnd: end };
  }, []);

  const projectsWithDates = useMemo(() => {
    return projects
      .filter(p => p.start_date || p.estimated_end_date)
      .sort((a, b) => {
        const dateA = a.start_date ? new Date(a.start_date) : new Date();
        const dateB = b.start_date ? new Date(b.start_date) : new Date();
        return dateA.getTime() - dateB.getTime();
      });
  }, [projects]);

  const getBarPosition = (project: Project) => {
    const startDate = project.start_date ? new Date(project.start_date) : new Date();
    const endDate = project.estimated_end_date ? new Date(project.estimated_end_date) : addDays(startDate, 30);
    
    const totalDays = days.length;
    const startOffset = Math.max(0, differenceInDays(startDate, monthStart));
    const duration = Math.max(1, differenceInDays(endDate, startDate));
    
    const left = (startOffset / totalDays) * 100;
    const width = Math.min((duration / totalDays) * 100, 100 - left);
    
    return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
  };

  const isDelayed = (project: Project) => {
    if (!project.estimated_end_date) return false;
    if (project.status === 'POS_VENDA') return false;
    return new Date(project.estimated_end_date) < new Date();
  };

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Cronograma de Instalações</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {format(monthStart, "MMMM 'de' yyyy", { locale: ptBR })} - {format(monthEnd, "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <ScrollArea className="w-full">
        <div className="min-w-[800px]">
          {/* Timeline Header */}
          <div className="flex border-b border-border bg-muted/30 sticky top-0">
            <div className="w-[200px] flex-shrink-0 p-3 border-r border-border">
              <span className="text-xs font-medium text-muted-foreground">PROJETO</span>
            </div>
            <div className="flex-1 flex">
              {days.map((day, index) => {
                const isCurrentDay = isToday(day);
                const isFirstOfMonth = day.getDate() === 1;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex-1 min-w-[24px] text-center py-1 border-r border-border/30',
                      isCurrentDay && 'bg-impulse-gold/20',
                      isFirstOfMonth && 'border-l border-border'
                    )}
                  >
                    {isFirstOfMonth && (
                      <div className="text-[9px] font-semibold text-foreground uppercase">
                        {format(day, 'MMM', { locale: ptBR })}
                      </div>
                    )}
                    <div className={cn(
                      'text-[10px]',
                      isCurrentDay ? 'text-impulse-gold font-bold' : 'text-muted-foreground'
                    )}>
                      {day.getDate()}
                    </div>
                    <div className="text-[8px] text-muted-foreground/60">
                      {weekDays[day.getDay()]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Rows */}
          <div className="divide-y divide-border">
            {projectsWithDates.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">Nenhum projeto com datas definidas</p>
              </div>
            ) : (
              projectsWithDates.map((project) => {
                const clientName = project.client_id ? clientNames[project.client_id] : 'Cliente';
                const stage = getStageByKey(project.status, stages) || stages[0];
                const delayed = isDelayed(project);
                const position = getBarPosition(project);

                return (
                  <div
                    key={project.id}
                    className="flex hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onProjectClick(project)}
                  >
                    {/* Project Info */}
                    <div className="w-[200px] flex-shrink-0 p-3 border-r border-border">
                      <div className="flex items-center gap-2">
                        {delayed ? (
                          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        ) : project.status === 'POS_VENDA' ? (
                          <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                        ) : (
                          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', stage.color)} />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.power_kwp ? `${project.power_kwp} kWp` : stage.label}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative h-[60px] flex items-center">
                      {/* Today marker */}
                      {days.findIndex(d => isToday(d)) >= 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-impulse-gold z-10"
                          style={{ left: `${(days.findIndex(d => isToday(d)) / days.length) * 100}%` }}
                        />
                      )}
                      
                      {/* Project bar */}
                      <div
                        className={cn(
                          'absolute h-8 rounded-md flex items-center px-2 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:scale-[1.02]',
                          delayed ? 'bg-destructive' : stage.color
                        )}
                        style={position}
                      >
                        <span className="truncate">
                          {project.start_date && format(new Date(project.start_date), 'dd/MM')}
                          {' - '}
                          {project.estimated_end_date && format(new Date(project.estimated_end_date), 'dd/MM')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Legend */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-impulse-gold rounded" />
            <span className="text-muted-foreground">Hoje</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 text-destructive" />
            <span className="text-muted-foreground">Atrasado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-success" />
            <span className="text-muted-foreground">Concluído</span>
          </div>
        </div>
      </div>
    </div>
  );
}
