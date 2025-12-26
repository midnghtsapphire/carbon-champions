import { useEffect, useState } from "react";
import { Trophy, TrendingDown, Flame, Medal, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  user_id: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  weekly_reduction: number | null;
  current_streak: number | null;
}

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_leaderboard')
        .select('*')
        .order('weekly_reduction', { ascending: false })
        .limit(5);

      if (error) throw error;
      setLeaderboardData(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to realtime updates on carbon_entries
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carbon_entries'
        },
        () => {
          // Refetch leaderboard when carbon entries change
          fetchLeaderboard();
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatReduction = (value: number | null) => {
    if (value === null || value === 0) return '0';
    return value.toFixed(1);
  };

  return (
    <section className="py-24 bg-background relative overflow-hidden" id="leaderboard">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              Live Leaderboard
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Compete With
              <br />
              <span className="text-gradient-accent">Climate Heroes</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of players reducing their carbon footprint. See where you rank globally, in your city, or against friends.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-gradient-card border border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  <span className="text-sm text-muted-foreground">Weekly Prize</span>
                </div>
                <p className="text-2xl font-bold">$500</p>
                <p className="text-sm text-muted-foreground">in eco rewards</p>
              </div>
              <div className="p-6 rounded-2xl bg-gradient-card border border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingDown className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Reduced</span>
                </div>
                <p className="text-2xl font-bold">5.2M</p>
                <p className="text-sm text-muted-foreground">tons of CO₂</p>
              </div>
            </div>
          </div>

          {/* Right - Leaderboard */}
          <div className="relative">
            <div className="p-6 rounded-3xl bg-gradient-card border border-border/50 shadow-elevated">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">This Week's Top Players</h3>
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  isLive 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted/50 text-muted-foreground'
                }`}>
                  <Wifi className={`w-3 h-3 ${isLive ? 'animate-pulse' : ''}`} />
                  {isLive ? 'Live' : 'Connecting...'}
                </span>
              </div>

              {/* Leaderboard list */}
              <div className="space-y-3">
                {loading ? (
                  // Loading skeleton
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 animate-pulse">
                      <div className="w-8 h-6 bg-muted rounded" />
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-24" />
                        <div className="h-3 bg-muted rounded w-16" />
                      </div>
                      <div className="w-16 h-8 bg-muted rounded" />
                    </div>
                  ))
                ) : leaderboardData.length === 0 ? (
                  // Empty state
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No entries yet this week</p>
                    <p className="text-sm text-muted-foreground/70">Be the first to log your carbon savings!</p>
                  </div>
                ) : (
                  // Leaderboard entries
                  leaderboardData.map((player, index) => (
                    <div
                      key={player.user_id || index}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-secondary/50 ${
                        index === 0 ? 'bg-accent/10 border border-accent/20' : ''
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-8 flex justify-center">
                        {index === 0 ? (
                          <Medal className="w-6 h-6 text-accent" />
                        ) : index === 1 ? (
                          <Medal className="w-6 h-6 text-muted-foreground" />
                        ) : index === 2 ? (
                          <Medal className="w-6 h-6 text-amber-700" />
                        ) : (
                          <span className="text-muted-foreground font-medium">{index + 1}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      {player.avatar_url ? (
                        <img 
                          src={player.avatar_url} 
                          alt={player.display_name || 'User'} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground'
                        }`}>
                          {getInitials(player.display_name || player.username)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {player.display_name || player.username || 'Anonymous'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {player.city || 'Earth'}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm" title="Current streak">
                          <Flame className="w-4 h-4 text-accent" />
                          <span>{player.current_streak || 0}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            -{formatReduction(player.weekly_reduction)} kg
                          </p>
                          <p className="text-xs text-muted-foreground">CO₂</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-border/50 text-center">
                <button className="text-primary font-medium hover:underline text-sm">
                  View Full Leaderboard →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Leaderboard;
