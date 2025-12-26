import { Activity, Trophy, Users, Gift, TrendingDown, Zap } from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Real-Time Tracking",
    description: "Connect your bank accounts and travel apps to automatically calculate your carbon footprint from every purchase and trip.",
    color: "primary" as const,
  },
  {
    icon: Trophy,
    title: "Compete & Win",
    description: "Join weekly challenges, climb city leaderboards, and compete with friends to see who can reduce their impact the most.",
    color: "accent" as const,
  },
  {
    icon: Users,
    title: "Team Challenges",
    description: "Create or join company and community teams. Compete in corporate sustainability challenges and earn bragging rights.",
    color: "primary" as const,
  },
  {
    icon: Gift,
    title: "Earn Rewards",
    description: "Redeem your eco-points for discounts on sustainable products, plant trees, or donate to environmental causes.",
    color: "accent" as const,
  },
  {
    icon: TrendingDown,
    title: "Personal Budget",
    description: "Set your own carbon budget and get personalized tips to stay on track. Visual progress charts keep you motivated.",
    color: "primary" as const,
  },
  {
    icon: Zap,
    title: "Instant Insights",
    description: "Understand the impact of every choice. See how your diet, travel, and shopping habits affect the planet.",
    color: "accent" as const,
  },
];

const Features = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden" id="features">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Everything You Need to
            <br />
            <span className="text-gradient-primary">Go Carbon Neutral</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Powerful tools wrapped in a fun, gamified experience that makes saving the planet addictive.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-8 rounded-2xl bg-gradient-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div 
                className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 ${
                  feature.color === 'primary' 
                    ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:glow-primary' 
                    : 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground group-hover:glow-accent'
                }`}
              >
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
