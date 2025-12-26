import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "Basic carbon tracking",
      "Weekly reports",
      "Community challenges",
      "Personal leaderboard",
    ],
    cta: "Get Started",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Premium",
    price: "$7.99",
    period: "/month",
    description: "For serious climate action",
    features: [
      "Everything in Free",
      "Real-time bank integration",
      "Advanced analytics",
      "Team challenges",
      "Priority support",
      "Exclusive rewards",
    ],
    cta: "Start Free Trial",
    variant: "hero" as const,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations & teams",
    features: [
      "Everything in Premium",
      "Unlimited team members",
      "White-label options",
      "API access",
      "Dedicated success manager",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    variant: "outline" as const,
    popular: false,
  },
];

const Pricing = () => {
  return (
    <section className="py-24 bg-secondary/30 relative overflow-hidden" id="pricing">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Plans That Scale With
            <br />
            <span className="text-gradient-primary">Your Impact</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Start free, upgrade when you're ready to go pro.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-3xl transition-all duration-300 ${
                plan.popular
                  ? 'bg-gradient-card border-2 border-primary/50 shadow-elevated scale-105'
                  : 'bg-gradient-card border border-border/50 hover:border-primary/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-primary flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-primary-foreground fill-current" />
                  <span className="text-sm font-semibold text-primary-foreground">Most Popular</span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              <div className="mb-8">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button variant={plan.variant} className="w-full" size="lg">
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
