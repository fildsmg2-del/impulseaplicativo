import { useState, useEffect } from 'react';
import { Target, Edit2, Check, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SalesGoalCardProps {
  currentSales: number;
  onGoalChange?: (goal: number) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
  }).format(value);

export function SalesGoalCard({ currentSales, onGoalChange }: SalesGoalCardProps) {
  const [goal, setGoal] = useState<number>(() => {
    const saved = localStorage.getItem('salesGoal');
    return saved ? Number(saved) : 500000;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState(goal);

  const progress = goal > 0 ? Math.min((currentSales / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - currentSales, 0);

  const handleSave = () => {
    setGoal(tempGoal);
    localStorage.setItem('salesGoal', String(tempGoal));
    onGoalChange?.(tempGoal);
    setIsEditing(false);
  };

  const getProgressColor = () => {
    if (progress >= 100) return 'bg-success';
    if (progress >= 75) return 'bg-impulse-gold';
    if (progress >= 50) return 'bg-chart-3';
    return 'bg-chart-1';
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-impulse animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-impulse-gold/10">
            <Target className="h-5 w-5 text-impulse-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Meta Mensal</h3>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        
        {isEditing ? (
          <Button size="sm" variant="ghost" onClick={handleSave}>
            <Check className="h-4 w-4 text-success" />
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="mb-4">
          <Input
            type="number"
            value={tempGoal}
            onChange={(e) => setTempGoal(Number(e.target.value))}
            className="text-lg font-bold"
            placeholder="Digite a meta..."
          />
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {formatCurrency(currentSales)}
            </span>
            <span className="text-muted-foreground">/ {formatCurrency(goal)}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className={cn(
            'font-semibold',
            progress >= 100 ? 'text-success' : 'text-foreground'
          )}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div
            className={cn('h-3 rounded-full transition-all duration-500', getProgressColor())}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {progress >= 100 ? (
        <div className="mt-4 flex items-center gap-2 text-success text-sm">
          <TrendingUp className="h-4 w-4" />
          <span className="font-medium">Meta atingida!</span>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Faltam <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span> para atingir a meta
        </p>
      )}
    </div>
  );
}
