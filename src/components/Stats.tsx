import { useEffect, useState, useRef } from "react";

const stats = [
  { value: 200000, suffix: "+", label: "Active Users" },
  { value: 5.2, suffix: "M", label: "Tons CO₂ Saved", decimals: 1 },
  { value: 500, suffix: "+", label: "Corporate Teams" },
  { value: 42, suffix: "%", label: "Avg. Reduction" },
];

const useCountUp = (end: number, duration: number = 2000, decimals: number = 0) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(easeOutQuart * end);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [isVisible, end, duration]);

  return { count: count.toFixed(decimals), ref };
};

const Stats = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-y border-border/50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => {
            const { count, ref } = useCountUp(stat.value, 2500, stat.decimals || 0);
            return (
              <div key={stat.label} ref={ref} className="text-center">
                <p className="text-4xl md:text-5xl font-extrabold mb-2">
                  <span className="text-gradient-primary">{count}</span>
                  <span className="text-accent">{stat.suffix}</span>
                </p>
                <p className="text-muted-foreground font-medium">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Stats;
