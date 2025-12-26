import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
}

interface CheckAchievementsResult {
  success: boolean;
  newlyUnlocked: UnlockedAchievement[];
  totalUnlocked: number;
}

export function useAchievements() {
  const [checking, setChecking] = useState(false);

  const checkAchievements = async (): Promise<UnlockedAchievement[]> => {
    setChecking(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.log('No active session, skipping achievement check');
        return [];
      }

      const { data, error } = await supabase.functions.invoke<CheckAchievementsResult>(
        'check-achievements',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        console.error('Error checking achievements:', error);
        return [];
      }

      // Show toast for each newly unlocked achievement
      if (data?.newlyUnlocked && data.newlyUnlocked.length > 0) {
        for (const achievement of data.newlyUnlocked) {
          toast({
            title: `🎉 Achievement Unlocked!`,
            description: `${achievement.icon} ${achievement.name} (+${achievement.xp_reward} XP)`,
          });
        }
      }

      return data?.newlyUnlocked || [];
    } catch (error) {
      console.error('Failed to check achievements:', error);
      return [];
    } finally {
      setChecking(false);
    }
  };

  return { checkAchievements, checking };
}
