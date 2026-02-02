import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, TrendingDown, Calendar, Trophy, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths } from 'date-fns';

interface Goal {
  id: string;
  goal_type: 'weekly' | 'monthly';
  target_reduction: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  progress?: number;
}

interface GoalSettingProps {
  open: boolean;
  onClose: () => void;
}

export default function GoalSetting({ open, onClose }: GoalSettingProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalType, setGoalType] = useState<'weekly' | 'monthly'>('weekly');
  const [targetReduction, setTargetReduction] = useState('');

  useEffect(() => {
    if (open && user) {
      fetchGoals();
    }
  }, [open, user]);

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch active goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Calculate progress for each goal
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
          return {
            ...goal,
            progress: totalReduction,
          } as Goal;
        })
      );

      setGoals(goalsWithProgress);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!user || !targetReduction) return;

    const target = parseFloat(targetReduction);
    if (isNaN(target) || target <= 0) {
      toast.error('Please enter a valid target');
      return;
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (goalType === 'weekly') {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    try {
      if (editingGoal) {
        const { error } = await supabase
          .from('user_goals')
          .update({
            target_reduction: target,
            goal_type: goalType,
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
          })
          .eq('id', editingGoal.id);

        if (error) throw error;
        toast.success('Goal updated!');
      } else {
        // Deactivate existing goals of same type
        await supabase
          .from('user_goals')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('goal_type', goalType)
          .eq('is_active', true);

        const { error } = await supabase
          .from('user_goals')
          .insert({
            user_id: user.id,
            goal_type: goalType,
            target_reduction: target,
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
          });

        if (error) throw error;
        toast.success('Goal created!');
      }

      setShowForm(false);
      setEditingGoal(null);
      setTargetReduction('');
      fetchGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Failed to save goal');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('user_goals')
        .update({ is_active: false })
        .eq('id', goalId);

      if (error) throw error;
      toast.success('Goal removed');
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to remove goal');
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalType(goal.goal_type);
    setTargetReduction(goal.target_reduction.toString());
    setShowForm(true);
  };

  const getProgressPercentage = (goal: Goal) => {
    return Math.min(((goal.progress || 0) / goal.target_reduction) * 100, 100);
  };

  const getGoalStatus = (goal: Goal) => {
    const percentage = getProgressPercentage(goal);
    if (percentage >= 100) return { label: 'Completed!', color: 'text-primary' };
    if (percentage >= 75) return { label: 'Almost there!', color: 'text-accent' };
    if (percentage >= 50) return { label: 'Good progress', color: 'text-sky-400' };
    if (percentage >= 25) return { label: 'Getting started', color: 'text-muted-foreground' };
    return { label: 'Just beginning', color: 'text-muted-foreground' };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Carbon Reduction Goals
          </DialogTitle>
        </DialogHeader>

        {showForm ? (
          <div className="space-y-4">
            <Tabs value={goalType} onValueChange={(v) => setGoalType(v as 'weekly' | 'monthly')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="weekly">Weekly Goal</TabsTrigger>
                <TabsTrigger value="monthly">Monthly Goal</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="target">Target Reduction (kg CO₂)</Label>
              <Input
                id="target"
                type="number"
                placeholder="e.g., 10"
                value={targetReduction}
                onChange={(e) => setTargetReduction(e.target.value)}
                min="0.1"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                {goalType === 'weekly' 
                  ? 'Set your weekly carbon reduction target' 
                  : 'Set your monthly carbon reduction target'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowForm(false);
                setEditingGoal(null);
                setTargetReduction('');
              }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateGoal}>
                {editingGoal ? 'Update Goal' : 'Set Goal'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4" />
              Set New Goal
            </Button>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading goals...</div>
            ) : goals.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No active goals</p>
                <p className="text-sm text-muted-foreground">Set a goal to track your progress!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => {
                  const status = getGoalStatus(goal);
                  const percentage = getProgressPercentage(goal);
                  
                  return (
                    <div 
                      key={goal.id} 
                      className="bg-secondary/50 rounded-xl p-4 border border-border"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {goal.goal_type === 'weekly' ? (
                            <Calendar className="w-4 h-4 text-primary" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-accent" />
                          )}
                          <span className="font-semibold capitalize">
                            {goal.goal_type} Goal
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleEdit(goal)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteGoal(goal.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className={status.color}>{status.label}</span>
                        </div>
                        <Progress value={percentage} className="h-3" />
                        <div className="flex justify-between text-xs mt-1">
                          <span>{(goal.progress || 0).toFixed(1)} kg reduced</span>
                          <span className="text-muted-foreground">
                            {goal.target_reduction} kg target
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(goal.start_date), 'MMM d')} - {format(new Date(goal.end_date), 'MMM d, yyyy')}</span>
                        {percentage >= 100 && (
                          <span className="flex items-center gap-1 text-primary">
                            <Trophy className="w-3 h-3" /> Goal achieved!
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
