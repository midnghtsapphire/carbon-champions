import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Leaf, 
  ArrowLeft,
  Trophy,
  Target,
  Clock,
  Users,
  Zap,
  CheckCircle2,
  Flame,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Challenge {
  id: string;
  name: string;
  description: string;
  challenge_type: string;
  target_value: number;
  xp_reward: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  // User progress
  joined?: boolean;
  progress?: number;
  completed?: boolean;
  joined_at?: string;
}

const CHALLENGE_ICONS: Record<string, React.ReactNode> = {
  transport: <Flame className="w-5 h-5" />,
  food: <Leaf className="w-5 h-5" />,
  energy: <Zap className="w-5 h-5" />,
  general: <Target className="w-5 h-5" />,
};

export default function Challenges() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchChallenges();
    }
  }, [user]);

  const fetchChallenges = async () => {
    if (!user) return;

    try {
      // Fetch all active challenges
      const { data: allChallenges, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('end_date', { ascending: true });

      if (challengesError) throw challengesError;

      // Fetch user's joined challenges
      const { data: userChallenges, error: userError } = await supabase
        .from('user_challenges')
        .select('challenge_id, progress, completed, joined_at')
        .eq('user_id', user.id);

      if (userError) throw userError;

      const userChallengeMap = new Map(
        userChallenges?.map(uc => [uc.challenge_id, uc])
      );

      const mergedChallenges = allChallenges?.map(c => {
        const userProgress = userChallengeMap.get(c.id);
        return {
          ...c,
          joined: !!userProgress,
          progress: Number(userProgress?.progress) || 0,
          completed: userProgress?.completed || false,
          joined_at: userProgress?.joined_at,
        };
      }) || [];

      setChallenges(mergedChallenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast({
        title: "Error",
        description: "Failed to load challenges.",
        variant: "destructive",
      });
    } finally {
      setLoadingChallenges(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    if (!user) return;

    setJoiningId(challengeId);

    try {
      const { error } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          progress: 0,
          completed: false,
        });

      if (error) throw error;

      toast({
        title: "Challenge Joined! 🎯",
        description: "Good luck completing this challenge!",
      });

      // Update local state
      setChallenges(prev => 
        prev.map(c => 
          c.id === challengeId 
            ? { ...c, joined: true, progress: 0, completed: false }
            : c
        )
      );
    } catch (error) {
      console.error('Error joining challenge:', error);
      toast({
        title: "Error",
        description: "Failed to join challenge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoiningId(null);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getProgressPercentage = (progress: number, target: number) => {
    return Math.min(100, (progress / target) * 100);
  };

  if (loading || loadingChallenges) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center animate-pulse">
          <Target className="w-7 h-7 text-primary-foreground" />
        </div>
      </div>
    );
  }

  const activeChallenges = challenges.filter(c => !c.completed);
  const completedChallenges = challenges.filter(c => c.completed);

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-accent flex items-center justify-center">
                <Trophy className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Challenges</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Take on a Challenge
          </h1>
          <p className="text-lg text-muted-foreground">
            Join challenges, reduce your carbon footprint, and earn XP rewards.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{challenges.length}</p>
            <p className="text-sm text-muted-foreground">Available</p>
          </div>
          <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{challenges.filter(c => c.joined && !c.completed).length}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
          <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-accent">{completedChallenges.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>

        {/* Active Challenges */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-5 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Active Challenges
          </h2>

          {activeChallenges.length === 0 ? (
            <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-8 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No active challenges at the moment.</p>
              <p className="text-sm text-muted-foreground/70">Check back soon for new challenges!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {activeChallenges.map((challenge) => {
                const daysRemaining = getDaysRemaining(challenge.end_date);
                const progressPercent = getProgressPercentage(challenge.progress || 0, challenge.target_value);

                return (
                  <div 
                    key={challenge.id}
                    className={`bg-card/50 backdrop-blur border rounded-xl p-5 transition-all ${
                      challenge.joined 
                        ? 'border-primary/30 bg-primary/5' 
                        : 'border-border hover:border-primary/20'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          challenge.joined ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                        }`}>
                          {CHALLENGE_ICONS[challenge.challenge_type] || CHALLENGE_ICONS.general}
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">{challenge.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">{challenge.challenge_type}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold">
                        +{challenge.xp_reward} XP
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm mb-4">{challenge.description}</p>

                    {/* Progress (if joined) */}
                    {challenge.joined && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-foreground font-medium">
                            {challenge.progress || 0} / {challenge.target_value}
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {daysRemaining} days left
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {challenge.target_value} goal
                        </span>
                      </div>

                      {!challenge.joined ? (
                        <Button 
                          variant="hero" 
                          size="sm"
                          onClick={() => joinChallenge(challenge.id)}
                          disabled={joiningId === challenge.id}
                        >
                          {joiningId === challenge.id ? 'Joining...' : 'Join'}
                        </Button>
                      ) : (
                        <span className="text-sm font-medium text-primary flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Joined
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Completed Challenges */}
        {completedChallenges.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-5 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              Completed Challenges
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedChallenges.map((challenge) => (
                <div 
                  key={challenge.id}
                  className="bg-accent/5 border border-accent/20 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{challenge.name}</h3>
                      <p className="text-xs text-muted-foreground">{challenge.xp_reward} XP earned</p>
                    </div>
                  </div>
                  <p className="text-xs text-accent flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
