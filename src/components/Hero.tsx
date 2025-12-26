import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, Trophy, Users, ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse-glow animation-delay-500" />
      
      {/* Floating elements */}
      <div className="absolute top-20 right-20 animate-float opacity-20">
        <Leaf className="w-16 h-16 text-primary" />
      </div>
      <div className="absolute bottom-40 left-16 animate-float-delayed opacity-20">
        <Trophy className="w-12 h-12 text-accent" />
      </div>

      <div className="container mx-auto px-6 py-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm mb-8 animate-slide-up">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">Join 50,000+ climate heroes</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 animate-slide-up animation-delay-100">
            Turn Your Carbon
            <br />
            <span className="text-gradient-primary">Footprint Into</span>
            <br />
            <span className="text-gradient-accent">A Game</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up animation-delay-200">
            Track, compete, and reduce your environmental impact. 
            Join challenges, climb leaderboards, and earn rewards for going green.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-slide-up animation-delay-300">
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="glass" size="xl" asChild>
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>

          {/* Social proof */}
          <div className="flex flex-wrap justify-center gap-8 text-center animate-slide-up animation-delay-400">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">200K+ Users</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              <span className="text-muted-foreground">5M+ Tons CO₂ Saved</span>
            </div>
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">500+ Corporate Teams</span>
            </div>
          </div>
        </div>

        {/* App preview mockup */}
        <div className="mt-16 max-w-5xl mx-auto animate-slide-up animation-delay-500">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-gradient-card rounded-3xl border border-border/50 p-6 shadow-elevated">
              <div className="bg-secondary/50 rounded-2xl p-8 min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-primary flex items-center justify-center glow-primary">
                    <Leaf className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <p className="text-lg text-muted-foreground">App Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
