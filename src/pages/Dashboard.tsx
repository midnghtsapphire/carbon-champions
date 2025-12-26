import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import CarbonEntryForm from '@/components/CarbonEntryForm';
import { 
  Leaf, 
  LogOut, 
  TrendingDown, 
  Flame, 
  Trophy, 
  Target,
  Plus,
  ChevronRight
} from 'lucide-react';

interface Profile {
  display_name: string | null;
  total_carbon_saved: number;
  current_streak: number;
  level: number;
  xp_points: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at?: string;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  target_value: number;
  xp_reward: number;
  progress?: number;
  completed?: boolean;
}

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showEntryForm, setShowEntryForm] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch achievements with user progress
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*');

      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user.id);

      const achievementMap = new Map(userAchievements?.map(ua => [ua.achievement_id, ua.unlocked_at]));
      
      const mergedAchievements = allAchievements?.map(a => ({
        ...a,
        unlocked_at: achievementMap.get(a.id),
      })) || [];

      setAchievements(mergedAchievements);

      // Fetch active challenges with user progress
      const { data: activeChallenges } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true);

      const { data: userChallenges } = await supabase
        .from('user_challenges')
        .select('challenge_id, progress, completed')
        .eq('user_id', user.id);

      const challengeMap = new Map(userChallenges?.map(uc => [uc.challenge_id, { progress: uc.progress, completed: uc.completed }]));
      
      const mergedChallenges = activeChallenges?.map(c => ({
        ...c,
        progress: challengeMap.get(c.id)?.progress || 0,
        completed: challengeMap.get(c.id)?.completed || false,
      })) || [];

      setChallenges(mergedChallenges);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center animate-pulse">
          <Leaf className="w-7 h-7 text-primary-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">CarbonZero</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile?.display_name || user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Welcome & Stats */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.display_name?.split(' ')[0] || 'Eco Warrior'}!
          </h1>
          <p className="text-muted-foreground">Track your impact and keep up the great work.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{profile?.total_carbon_saved || 0} kg</p>
            <p className="text-sm text-muted-foreground">CO₂ Reduced</p>
          </div>

          <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-accent" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{profile?.current_streak || 0} days</p>
            <p className="text-sm text-muted-foreground">Current Streak</p>
          </div>

          <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">Level {profile?.level || 1}</p>
            <p className="text-sm text-muted-foreground">{profile?.xp_points || 0} XP</p>
          </div>

          <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{achievements.filter(a => a.unlocked_at).length}/{achievements.length}</p>
            <p className="text-sm text-muted-foreground">Achievements</p>
          </div>
        </div>

        {/* Log Entry CTA */}
        <div className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Log Your Carbon Activity</h2>
              <p className="text-muted-foreground">Track your daily activities to reduce your footprint.</p>
            </div>
            <Button variant="hero" size="lg" className="gap-2" onClick={() => setShowEntryForm(true)}>
              <Plus className="w-5 h-5" />
              Log Entry
            </Button>
          </div>
        </div>

        <CarbonEntryForm 
          open={showEntryForm} 
          onClose={() => setShowEntryForm(false)}
          onSuccess={fetchDashboardData}
        />

        <div className="grid md:grid-cols-2 gap-8">
          {/* Active Challenges */}
          <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Active Challenges</h2>
              <Link to="/challenges">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-primary">
                  View All <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            
            {challenges.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active challenges right now.</p>
            ) : (
              <div className="space-y-4">
                {challenges.slice(0, 3).map((challenge) => (
                  <div key={challenge.id} className="bg-secondary/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{challenge.name}</h3>
                        <p className="text-sm text-muted-foreground">{challenge.description}</p>
                      </div>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                        +{challenge.xp_reward} XP
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-3">
                      <div 
                        className="bg-gradient-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((challenge.progress || 0) / challenge.target_value * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {challenge.progress || 0} / {challenge.target_value} {challenge.completed ? '✓ Completed' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Achievements</h2>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                View All <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-5 gap-3">
              {achievements.slice(0, 5).map((achievement) => (
                <div 
                  key={achievement.id}
                  className={`aspect-square rounded-xl flex items-center justify-center text-2xl ${
                    achievement.unlocked_at 
                      ? 'bg-gradient-primary' 
                      : 'bg-muted/50 grayscale opacity-50'
                  }`}
                  title={`${achievement.name}: ${achievement.description}`}
                >
                  {achievement.icon}
                </div>
              ))}
            </div>
            
            <div className="mt-4 space-y-2">
              {achievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="flex items-center gap-3 text-sm">
                  <span className="text-lg">{achievement.icon}</span>
                  <div className="flex-1">
                    <span className={achievement.unlocked_at ? 'text-foreground' : 'text-muted-foreground'}>
                      {achievement.name}
                    </span>
                  </div>
                  {achievement.unlocked_at && (
                    <span className="text-xs text-primary">Unlocked</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
