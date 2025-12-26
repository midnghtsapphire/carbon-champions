import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, PieChartIcon } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';

interface CarbonAnalyticsProps {
  open: boolean;
  onClose: () => void;
}

interface CarbonEntry {
  id: string;
  entry_date: string;
  carbon_amount: number;
  category: string;
  is_reduction: boolean;
}

interface DailyData {
  date: string;
  reduced: number;
  emitted: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Transport': 'hsl(152, 60%, 45%)',
  'Energy': 'hsl(38, 90%, 55%)',
  'Food': 'hsl(200, 80%, 60%)',
  'Shopping': 'hsl(280, 70%, 60%)',
  'Waste': 'hsl(340, 70%, 55%)',
  'Other': 'hsl(160, 20%, 50%)',
};

export default function CarbonAnalytics({ open, onClose }: CarbonAnalyticsProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CarbonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (open && user) {
      fetchEntries();
    }
  }, [open, user, period]);

  const fetchEntries = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    const { data, error } = await supabase
      .from('carbon_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', format(startDate, 'yyyy-MM-dd'))
      .lte('entry_date', format(endDate, 'yyyy-MM-dd'))
      .order('entry_date', { ascending: true });

    if (!error && data) {
      setEntries(data);
    }
    setLoading(false);
  };

  // Process data for trend chart
  const getTrendData = (): DailyData[] => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entries.filter(e => e.entry_date === dateStr);
      
      const reduced = dayEntries
        .filter(e => e.is_reduction)
        .reduce((sum, e) => sum + Number(e.carbon_amount), 0);
      
      const emitted = dayEntries
        .filter(e => !e.is_reduction)
        .reduce((sum, e) => sum + Number(e.carbon_amount), 0);
      
      return {
        date: format(day, period === 'week' ? 'EEE' : 'dd'),
        reduced: Math.round(reduced * 100) / 100,
        emitted: Math.round(emitted * 100) / 100,
      };
    });
  };

  // Process data for category breakdown
  const getCategoryData = (): CategoryData[] => {
    const categoryTotals: Record<string, number> = {};
    
    entries.forEach(entry => {
      const category = entry.category || 'Other';
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += Number(entry.carbon_amount);
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        color: CATEGORY_COLORS[name] || CATEGORY_COLORS['Other'],
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    const totalReduced = entries
      .filter(e => e.is_reduction)
      .reduce((sum, e) => sum + Number(e.carbon_amount), 0);
    
    const totalEmitted = entries
      .filter(e => !e.is_reduction)
      .reduce((sum, e) => sum + Number(e.carbon_amount), 0);
    
    const netImpact = totalReduced - totalEmitted;
    const entryCount = entries.length;

    return {
      totalReduced: Math.round(totalReduced * 100) / 100,
      totalEmitted: Math.round(totalEmitted * 100) / 100,
      netImpact: Math.round(netImpact * 100) / 100,
      entryCount,
    };
  };

  const trendData = getTrendData();
  const categoryData = getCategoryData();
  const stats = getSummaryStats();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Carbon Analytics
          </DialogTitle>
        </DialogHeader>

        {/* Period Selector */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month')} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary/50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">CO₂ Reduced</span>
                </div>
                <p className="text-2xl font-bold text-primary">{stats.totalReduced} kg</p>
              </div>
              
              <div className="bg-secondary/50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">CO₂ Emitted</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{stats.totalEmitted} kg</p>
              </div>
              
              <div className="bg-secondary/50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Net Impact</span>
                </div>
                <p className={`text-2xl font-bold ${stats.netImpact >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {stats.netImpact >= 0 ? '+' : ''}{stats.netImpact} kg
                </p>
              </div>
              
              <div className="bg-secondary/50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  <span className="text-sm text-muted-foreground">Total Entries</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.entryCount}</p>
              </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-secondary/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {period === 'week' ? 'Weekly' : 'Monthly'} Trend
              </h3>
              
              {entries.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data for this period. Start logging your carbon activities!
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReduced" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(152, 60%, 45%)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(152, 60%, 45%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEmitted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 62%, 50%)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(0, 62%, 50%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 20%, 18%)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(140, 10%, 60%)" 
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(140, 10%, 60%)" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(160, 25%, 10%)', 
                        border: '1px solid hsl(160, 20%, 18%)',
                        borderRadius: '8px',
                        color: 'hsl(140, 20%, 95%)'
                      }}
                      formatter={(value: number, name: string) => [
                        `${value} kg`,
                        name === 'reduced' ? 'CO₂ Reduced' : 'CO₂ Emitted'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="reduced" 
                      stroke="hsl(152, 60%, 45%)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorReduced)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="emitted" 
                      stroke="hsl(0, 62%, 50%)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorEmitted)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="bg-secondary/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-accent" />
                  Category Breakdown
                </h3>
                
                {categoryData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No category data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(160, 25%, 10%)', 
                          border: '1px solid hsl(160, 20%, 18%)',
                          borderRadius: '8px',
                          color: 'hsl(140, 20%, 95%)'
                        }}
                        formatter={(value: number) => [`${value} kg CO₂`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Bar Chart */}
              <div className="bg-secondary/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  By Category
                </h3>
                
                {categoryData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No category data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 20%, 18%)" horizontal={false} />
                      <XAxis 
                        type="number" 
                        stroke="hsl(140, 10%, 60%)" 
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="hsl(140, 10%, 60%)" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(160, 25%, 10%)', 
                          border: '1px solid hsl(160, 20%, 18%)',
                          borderRadius: '8px',
                          color: 'hsl(140, 20%, 95%)'
                        }}
                        formatter={(value: number) => [`${value} kg CO₂`]}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Category Legend */}
            {categoryData.length > 0 && (
              <div className="flex flex-wrap gap-4 justify-center">
                {categoryData.map((category) => (
                  <div key={category.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-muted-foreground">{category.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
