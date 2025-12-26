import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserStats {
  total_carbon_saved: number;
  current_streak: number;
  longest_streak: number;
  xp_points: number;
  level: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from the JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking achievements for user: ${user.id}`);

    // Fetch user's profile stats
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('total_carbon_saved, current_streak, longest_streak, xp_points, level')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stats: UserStats = {
      total_carbon_saved: Number(profile.total_carbon_saved) || 0,
      current_streak: profile.current_streak || 0,
      longest_streak: profile.longest_streak || 0,
      xp_points: profile.xp_points || 0,
      level: profile.level || 1,
    };

    console.log('User stats:', stats);

    // Count completed challenges
    const { count: completedChallenges } = await supabase
      .from('user_challenges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', true);

    // Count total entries
    const { count: totalEntries } = await supabase
      .from('carbon_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    console.log(`Completed challenges: ${completedChallenges}, Total entries: ${totalEntries}`);

    // Fetch all achievements
    const { data: allAchievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*');

    if (achievementsError) {
      console.error('Error fetching achievements:', achievementsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch achievements' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch already unlocked achievements
    const { data: unlockedAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);

    const unlockedIds = new Set(unlockedAchievements?.map(ua => ua.achievement_id) || []);

    // Check which achievements should be unlocked
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of allAchievements as Achievement[]) {
      // Skip if already unlocked
      if (unlockedIds.has(achievement.id)) continue;

      let shouldUnlock = false;

      switch (achievement.requirement_type) {
        case 'reduction':
        case 'total_carbon_saved':
          shouldUnlock = stats.total_carbon_saved >= achievement.requirement_value;
          break;
        case 'streak':
        case 'streak_days':
          shouldUnlock = Math.max(stats.current_streak, stats.longest_streak) >= achievement.requirement_value;
          break;
        case 'challenges_completed':
          shouldUnlock = (completedChallenges || 0) >= achievement.requirement_value;
          break;
        case 'entries':
          shouldUnlock = (totalEntries || 0) >= achievement.requirement_value;
          break;
        default:
          console.log(`Unknown requirement type: ${achievement.requirement_type}`);
      }

      if (shouldUnlock) {
        console.log(`Unlocking achievement: ${achievement.name}`);
        
        // Insert into user_achievements
        const { error: insertError } = await supabase
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: achievement.id,
          });

        if (!insertError) {
          newlyUnlocked.push(achievement);
        } else {
          console.error(`Failed to unlock achievement ${achievement.name}:`, insertError);
        }
      }
    }

    // Award XP for newly unlocked achievements
    if (newlyUnlocked.length > 0) {
      const totalXpEarned = newlyUnlocked.reduce((sum, a) => sum + (a.xp_reward || 0), 0);
      const newXp = stats.xp_points + totalXpEarned;
      
      // Simple level calculation: level up every 100 XP
      const newLevel = Math.floor(newXp / 100) + 1;

      await supabase
        .from('profiles')
        .update({ 
          xp_points: newXp,
          level: newLevel
        })
        .eq('user_id', user.id);

      console.log(`Awarded ${totalXpEarned} XP. New total: ${newXp}, Level: ${newLevel}`);
    }

    console.log(`Unlocked ${newlyUnlocked.length} new achievements`);

    return new Response(
      JSON.stringify({ 
        success: true,
        newlyUnlocked: newlyUnlocked.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          xp_reward: a.xp_reward,
        })),
        totalUnlocked: newlyUnlocked.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-achievements function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
