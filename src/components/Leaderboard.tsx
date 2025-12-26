import { Trophy, TrendingDown, Flame, Medal } from "lucide-react";

const leaderboardData = [
  { rank: 1, name: "Sarah Chen", city: "San Francisco", reduction: 42, streak: 28, avatar: "SC" },
  { rank: 2, name: "Marcus Johnson", city: "Austin", reduction: 38, streak: 21, avatar: "MJ" },
  { rank: 3, name: "Emma Wilson", city: "Seattle", reduction: 35, streak: 14, avatar: "EW" },
  { rank: 4, name: "David Kim", city: "Boston", reduction: 33, streak: 35, avatar: "DK" },
  { rank: 5, name: "Lisa Martinez", city: "Denver", reduction: 31, streak: 19, avatar: "LM" },
];

const Leaderboard = () => {
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
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Live
                </span>
              </div>

              {/* Leaderboard list */}
              <div className="space-y-3">
                {leaderboardData.map((player, index) => (
                  <div
                    key={player.name}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-secondary/50 ${
                      index === 0 ? 'bg-accent/10 border border-accent/20' : ''
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-8 flex justify-center">
                      {player.rank === 1 ? (
                        <Medal className="w-6 h-6 text-accent" />
                      ) : player.rank === 2 ? (
                        <Medal className="w-6 h-6 text-muted-foreground" />
                      ) : player.rank === 3 ? (
                        <Medal className="w-6 h-6 text-amber-700" />
                      ) : (
                        <span className="text-muted-foreground font-medium">{player.rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground'
                    }`}>
                      {player.avatar}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{player.name}</p>
                      <p className="text-sm text-muted-foreground">{player.city}</p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Flame className="w-4 h-4 text-accent" />
                        <span>{player.streak}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">-{player.reduction}%</p>
                        <p className="text-xs text-muted-foreground">CO₂</p>
                      </div>
                    </div>
                  </div>
                ))}
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
