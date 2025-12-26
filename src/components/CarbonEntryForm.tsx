import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAchievements } from '@/hooks/useAchievements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Car, 
  Utensils, 
  Zap, 
  ShoppingBag,
  Leaf,
  Calculator,
} from 'lucide-react';
import { getCarbonComparisons, formatComparisonValue } from '@/lib/carbonComparisons';
import { toast } from '@/hooks/use-toast';

// Carbon emission factors (kg CO2 per unit)
const EMISSION_FACTORS = {
  transport: {
    car_petrol: { factor: 0.21, unit: 'km', label: 'Car (Petrol)' },
    car_diesel: { factor: 0.27, unit: 'km', label: 'Car (Diesel)' },
    car_electric: { factor: 0.05, unit: 'km', label: 'Car (Electric)' },
    bus: { factor: 0.089, unit: 'km', label: 'Bus' },
    train: { factor: 0.041, unit: 'km', label: 'Train' },
    flight_domestic: { factor: 0.255, unit: 'km', label: 'Flight (Domestic)' },
    flight_international: { factor: 0.195, unit: 'km', label: 'Flight (International)' },
    bicycle: { factor: -0.21, unit: 'km', label: 'Bicycle (vs Car)' },
    walking: { factor: -0.21, unit: 'km', label: 'Walking (vs Car)' },
  },
  food: {
    beef: { factor: 27, unit: 'kg', label: 'Beef' },
    lamb: { factor: 39, unit: 'kg', label: 'Lamb' },
    pork: { factor: 12, unit: 'kg', label: 'Pork' },
    chicken: { factor: 6.9, unit: 'kg', label: 'Chicken' },
    fish: { factor: 5, unit: 'kg', label: 'Fish' },
    dairy: { factor: 3.2, unit: 'kg', label: 'Dairy Products' },
    vegetables: { factor: 2, unit: 'kg', label: 'Vegetables' },
    plant_based_meal: { factor: -5, unit: 'meal', label: 'Plant-Based Meal (vs Meat)' },
    local_food: { factor: -1, unit: 'meal', label: 'Local/Seasonal Food' },
  },
  energy: {
    electricity: { factor: 0.5, unit: 'kWh', label: 'Electricity' },
    natural_gas: { factor: 2.0, unit: 'm³', label: 'Natural Gas' },
    heating_oil: { factor: 2.68, unit: 'L', label: 'Heating Oil' },
    solar_panel: { factor: -0.5, unit: 'kWh', label: 'Solar Energy Generated' },
    led_switch: { factor: -0.04, unit: 'hours', label: 'LED vs Incandescent' },
    thermostat_reduction: { factor: -0.15, unit: '°C reduced', label: 'Thermostat Reduction' },
  },
  shopping: {
    new_clothing: { factor: 15, unit: 'item', label: 'New Clothing' },
    electronics: { factor: 50, unit: 'item', label: 'Electronics' },
    furniture: { factor: 75, unit: 'item', label: 'New Furniture' },
    secondhand: { factor: -10, unit: 'item', label: 'Secondhand Purchase' },
    repaired_item: { factor: -20, unit: 'item', label: 'Repaired vs New' },
    recycled: { factor: -2, unit: 'kg', label: 'Recycled Materials' },
  },
};

const CATEGORY_ICONS = {
  transport: Car,
  food: Utensils,
  energy: Zap,
  shopping: ShoppingBag,
};

const CATEGORY_LABELS = {
  transport: 'Transport',
  food: 'Food',
  energy: 'Energy',
  shopping: 'Shopping',
};

type CategoryKey = keyof typeof EMISSION_FACTORS;
type ActivityInfo = { factor: number; unit: string; label: string };

interface CarbonEntryFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CarbonEntryForm({ open, onClose, onSuccess }: CarbonEntryFormProps) {
  const { user } = useAuth();
  const { checkAchievements } = useAchievements();
  const [category, setCategory] = useState<CategoryKey | ''>('');
  const [activity, setActivity] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activities = category ? EMISSION_FACTORS[category] : null;
  const selectedActivity: ActivityInfo | null = category && activity && activities
    ? (activities as Record<string, ActivityInfo>)[activity] ?? null
    : null;
  
  const calculatedCarbon = selectedActivity && quantity 
    ? parseFloat(quantity) * selectedActivity.factor 
    : 0;
  
  const isReduction = calculatedCarbon < 0;

  const resetForm = () => {
    setCategory('');
    setActivity('');
    setQuantity('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !category || !activity || !quantity) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('carbon_entries').insert({
        user_id: user.id,
        category,
        activity: selectedActivity?.label || activity,
        carbon_amount: Math.abs(calculatedCarbon),
        is_reduction: isReduction,
        notes: notes || null,
      });

      if (error) throw error;

      // Update profile totals if it's a reduction
      if (isReduction) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_carbon_saved')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const currentSaved = Number(profile?.total_carbon_saved) || 0;
        await supabase
          .from('profiles')
          .update({ total_carbon_saved: currentSaved + Math.abs(calculatedCarbon) })
          .eq('user_id', user.id);
      }

      toast({
        title: isReduction ? "Great job! 🌱" : "Entry logged",
        description: isReduction 
          ? `You saved ${Math.abs(calculatedCarbon).toFixed(2)} kg CO₂!`
          : `Logged ${calculatedCarbon.toFixed(2)} kg CO₂ emission.`,
      });

      // Check for newly unlocked achievements
      checkAchievements();

      resetForm();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error logging entry:', error);
      toast({
        title: "Error",
        description: "Failed to log entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Leaf className="w-5 h-5 text-primary" />
            Log Carbon Activity
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Track your daily activities and see your carbon impact.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label className="text-foreground">Category</Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(CATEGORY_ICONS) as Array<keyof typeof CATEGORY_ICONS>).map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      setActivity('');
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      category === cat
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-secondary/50 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{CATEGORY_LABELS[cat]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Selection */}
          {category && (
            <div className="space-y-2 animate-fade-in">
              <Label className="text-foreground">Activity</Label>
              <Select value={activity} onValueChange={setActivity}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Select activity..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {activities && Object.entries(activities).map(([key, value]) => {
                    const activityInfo = value as ActivityInfo;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className={activityInfo.factor < 0 ? 'text-primary' : ''}>
                          {activityInfo.label} {activityInfo.factor < 0 && '🌱'}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity Input */}
          {activity && selectedActivity && (
            <div className="space-y-2 animate-fade-in">
              <Label className="text-foreground">
                Quantity ({selectedActivity.unit})
              </Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={`Enter ${selectedActivity.unit}...`}
                className="bg-secondary/50 border-border"
              />
            </div>
          )}

          {/* CO2 Calculation Display */}
          {quantity && selectedActivity && (
            <div className={`rounded-xl p-4 animate-fade-in ${
              isReduction 
                ? 'bg-primary/10 border border-primary/30' 
                : 'bg-accent/10 border border-accent/30'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isReduction ? 'bg-primary/20' : 'bg-accent/20'
                }`}>
                  <Calculator className={`w-5 h-5 ${isReduction ? 'text-primary' : 'text-accent'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isReduction ? 'CO₂ Saved' : 'CO₂ Emission'}
                  </p>
                  <p className={`text-2xl font-bold ${isReduction ? 'text-primary' : 'text-accent'}`}>
                    {isReduction ? '-' : '+'}{Math.abs(calculatedCarbon).toFixed(2)} kg
                  </p>
                </div>
              </div>
              
              {/* CO2 Comparisons */}
              <div className="border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground mb-2">
                  {isReduction ? "That's like saving:" : "That's equivalent to:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {getCarbonComparisons(calculatedCarbon).map((comp, idx) => {
                    const Icon = comp.icon;
                    return (
                      <div 
                        key={idx}
                        className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md text-xs"
                      >
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {formatComparisonValue(comp.value)}
                        </span>
                        <span className="text-muted-foreground">{comp.unit}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-foreground">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              className="bg-secondary/50 border-border resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="hero"
              disabled={!category || !activity || !quantity || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Logging...' : 'Log Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
