import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="p-12 md:p-16 rounded-3xl bg-gradient-card border border-border/50 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-6 right-6 opacity-10">
              <Leaf className="w-24 h-24 text-primary" />
            </div>

            <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-gradient-primary flex items-center justify-center glow-primary">
              <Leaf className="w-8 h-8 text-primary-foreground" />
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Start Your
              <br />
              <span className="text-gradient-primary">Climate Journey?</span>
            </h2>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join over 200,000 people who are already tracking, reducing, and competing to save our planet. Your free trial starts now.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="glass" size="xl">
                Book a Demo
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required • Free forever plan available
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
