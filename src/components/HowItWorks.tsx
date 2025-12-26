import { CreditCard, BarChart3, Target, Award } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: CreditCard,
    title: "Connect Your Accounts",
    description: "Securely link your bank accounts and travel apps. We use bank-level encryption to keep your data safe.",
  },
  {
    number: "02",
    icon: BarChart3,
    title: "See Your Impact",
    description: "Our AI analyzes your spending and travel to calculate your carbon footprint in real-time.",
  },
  {
    number: "03",
    icon: Target,
    title: "Set Your Goals",
    description: "Create a personal carbon budget based on your lifestyle and reduction targets.",
  },
  {
    number: "04",
    icon: Award,
    title: "Compete & Earn",
    description: "Join challenges, climb leaderboards, and earn rewards for hitting your sustainability goals.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-secondary/30 relative overflow-hidden" id="how-it-works">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Start Saving the Planet
            <br />
            <span className="text-gradient-accent">In 4 Simple Steps</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Getting started takes less than 5 minutes. No credit card required.
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Connection line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-accent to-primary hidden md:block" />

            <div className="space-y-12">
              {steps.map((step, index) => (
                <div 
                  key={step.number}
                  className="relative flex gap-8 items-start group"
                >
                  {/* Step number */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-card border border-border flex items-center justify-center group-hover:border-primary/50 transition-colors duration-300">
                      <span className="text-2xl font-bold text-gradient-primary">{step.number}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <div className="p-6 rounded-2xl bg-gradient-card border border-border/50 group-hover:border-primary/30 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <step.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                          <p className="text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
