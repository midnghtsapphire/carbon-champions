import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Calendar, Flame } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface Goal {
  id: string;
  goal_type: 'weekly' | 'monthly';
  target_reduction: number;
  start_date: string;
  end_date: string;
  progress: number;
}

interface GoalProgressProps {
  onOpenGoals: () => void;
}

export default function GoalProgress({ onOpenGoals }: GoalProgressProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;

    try {
      const { data: goalsData } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('goal_type', { ascending: true });

      const goalsWithProgress = await Promise.all(
        (goalsData || []).map(async (goal) => {
          const { data: entries } = await supabase
            .from('carbon_entries')
            .select('carbon_amount')
            .eq('user_id', user.id)
            .eq('is_reduction', true)
            .gte('entry_date', goal.start_date)
            .lte('entry_date', goal.end_date);

          const totalReduction = entries?.reduce((sum, e) => sum + Number(e.carbon_amount), 0) || 0;
          return { ...goal, progress: totalReduction } as Goal;
        })
      );

      setGoals(goalsWithProgress);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="h-3 bg-muted rounded w-full" />
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <button
        onClick={onOpenGoals}
        className="w-full bg-card/50 backdrop-blur border border-dashed border-border rounded-xl p-5 hover:border-primary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Set Your Goals</p>
            <p className="text-sm text-muted-foreground">Track weekly or monthly targets</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => {
        const percentage = Math.min((goal.progress / goal.target_reduction) * 100, 100);
        const daysLeft = differenceInDays(new Date(goal.end_date), new Date());
        const isCompleted = percentage >= 100;

        return (
          <button
            key={goal.id}
            onClick={onOpenGoals}
            className="w-full bg-card/50 backdrop-blur border border-border rounded-xl p-5 hover:border-primary/30 transition-colors text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {goal.goal_type === 'weekly' ? (
                  <Calendar className="w-4 h-4 text-primary" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-accent" />
                )}
                <span className="font-medium capitalize">{goal.goal_type} Goal</span>
              </div>
              {isCompleted ? (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Completed!
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {daysLeft > 0 ? `${daysLeft} days left` : 'Ends today'}
                </span>
              )}
            </div>

            <Progress value={percentage} className="h-2 mb-2" />

            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">
                {goal.progress.toFixed(1)} kg
              </span>
              <span className="text-muted-foreground">
                / {goal.target_reduction} kg
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
