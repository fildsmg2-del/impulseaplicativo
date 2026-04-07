import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ChecklistItem {
  key: string;
  label: string;
}

interface ProjectStageChecklistProps {
  items: ChecklistItem[];
  checklist: Record<string, boolean>;
  onCheckChange: (key: string, checked: boolean) => void;
  disabled?: boolean;
}

export function ProjectStageChecklist({
  items,
  checklist,
  onCheckChange,
  disabled = false,
}: ProjectStageChecklistProps) {
  const completedCount = items.filter((item) => checklist[item.key]).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">
          {completedCount} de {items.length} itens concluídos
        </span>
        <span className="text-sm font-medium text-impulse-gold">{progress}%</span>
      </div>

      <div className="w-full bg-muted rounded-full h-2 mb-6">
        <div
          className="bg-impulse-gold h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Checkbox
                id={item.key}
                checked={checklist[item.key] || false}
                onCheckedChange={(checked) => onCheckChange(item.key, checked as boolean)}
                disabled={disabled}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor={item.key}
                  className={`text-sm cursor-pointer block ${
                    checklist[item.key] ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}
                >
                  {item.label}
                </Label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
