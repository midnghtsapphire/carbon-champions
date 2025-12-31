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
  Legend,
  LineChart,
  Line,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, PieChartIcon, ArrowUp, ArrowDown, Users, Target } from 'lucide-react';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, parseISO } from 'date-fns';

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

interface ProgressData {
  period: string;
  yourReduction: number;
  globalAverage: number;
  previousPeriod: number;
}

interface ComparisonStats {
  vsLastPeriod: number;
  vsGlobalAvg: number;
  percentile: number;
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
  const [historicalEntries, setHistoricalEntries] = useState<CarbonEntry[]>([]);
  const [globalStats, setGlobalStats] = useState<{ avgReduction: number; userCount: number }>({ avgReduction: 0, userCount: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (open && user) {
      fetchAllData();
    }
  }, [open, user, period]);

  const fetchAllData = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let historicalStartDate: Date;

    if (period === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      historicalStartDate = subWeeks(startDate, 8); // 8 weeks of history
    } else {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      historicalStartDate = subMonths(startDate, 6); // 6 months of history
    }

    // Fetch current period entries
    const { data: currentData } = await supabase
      .from('carbon_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', format(startDate, 'yyyy-MM-dd'))
      .lte('entry_date', format(endDate, 'yyyy-MM-dd'))
      .order('entry_date', { ascending: true });

    // Fetch historical entries for progress tracking
    const { data: historicalData } = await supabase
      .from('carbon_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', format(historicalStartDate, 'yyyy-MM-dd'))
      .lte('entry_date', format(endDate, 'yyyy-MM-dd'))
      .order('entry_date', { ascending: true });

    // Fetch global average from all users' reductions this period
    const { data: globalData } = await supabase
      .from('carbon_entries')
      .select('carbon_amount, user_id')
      .eq('is_reduction', true)
      .gte('entry_date', format(startDate, 'yyyy-MM-dd'))
      .lte('entry_date', format(endDate, 'yyyy-MM-dd'));

    if (currentData) setEntries(currentData);
    if (historicalData) setHistoricalEntries(historicalData);
    
    if (globalData && globalData.length > 0) {
      const uniqueUsers = new Set(globalData.map(e => e.user_id));
      const totalReduction = globalData.reduce((sum, e) => sum + Number(e.carbon_amount), 0);
      setGlobalStats({
        avgReduction: totalReduction / uniqueUsers.size,
        userCount: uniqueUsers.size
      });
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

  // Get progress over time (weekly or monthly periods)
  const getProgressData = (): ProgressData[] => {
    const now = new Date();
    const periods: ProgressData[] = [];
    
    if (period === 'week') {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        
        const weekEntries = historicalEntries.filter(e => {
          const entryDate = parseISO(e.entry_date);
          return entryDate >= weekStart && entryDate <= weekEnd;
        });
        
        const reduction = weekEntries
          .filter(e => e.is_reduction)
          .reduce((sum, e) => sum + Number(e.carbon_amount), 0);
        
        periods.push({
          period: format(weekStart, 'MMM d'),
          yourReduction: Math.round(reduction * 100) / 100,
          globalAverage: Math.round(globalStats.avgReduction * 100) / 100,
          previousPeriod: periods.length > 0 ? periods[periods.length - 1].yourReduction : 0
        });
      }
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        
        const monthEntries = historicalEntries.filter(e => {
          const entryDate = parseISO(e.entry_date);
          return entryDate >= monthStart && entryDate <= monthEnd;
        });
        
        const reduction = monthEntries
          .filter(e => e.is_reduction)
          .reduce((sum, e) => sum + Number(e.carbon_amount), 0);
        
        periods.push({
          period: format(monthStart, 'MMM'),
          yourReduction: Math.round(reduction * 100) / 100,
          globalAverage: Math.round(globalStats.avgReduction * 100) / 100,
          previousPeriod: periods.length > 0 ? periods[periods.length - 1].yourReduction : 0
        });
      }
    }
    
    return periods;
  };

  // Calculate comparison stats
  const getComparisonStats = (): ComparisonStats => {
    const stats = getSummaryStats();
    const progressData = getProgressData();
    
    // Compare to previous period
    const previousPeriodReduction = progressData.length >= 2 
      ? progressData[progressData.length - 2].yourReduction 
      : 0;
    const vsLastPeriod = previousPeriodReduction > 0 
      ? ((stats.totalReduced - previousPeriodReduction) / previousPeriodReduction) * 100 
      : 0;
    
    // Compare to global average
    const vsGlobalAvg = globalStats.avgReduction > 0 
      ? ((stats.totalReduced - globalStats.avgReduction) / globalStats.avgReduction) * 100 
      : 0;
    
    // Estimate percentile (simplified)
    const percentile = globalStats.avgReduction > 0 
      ? Math.min(99, Math.max(1, 50 + (vsGlobalAvg / 2))) 
      : 50;

    return {
      vsLastPeriod: Math.round(vsLastPeriod),
      vsGlobalAvg: Math.round(vsGlobalAvg),
      percentile: Math.round(percentile)
    };
  };

  const trendData = getTrendData();
  const categoryData = getCategoryData();
  const stats = getSummaryStats();
  const progressData = getProgressData();
  const comparisonStats = getComparisonStats();

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

            {/* Comparison Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-secondary/50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {comparisonStats.vsLastPeriod >= 0 ? (
                    <ArrowUp className="w-4 h-4 text-primary" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-destructive" />
                  )}
                  <span className="text-sm text-muted-foreground">vs Last {period === 'week' ? 'Week' : 'Month'}</span>
                </div>
                <p className={`text-2xl font-bold ${comparisonStats.vsLastPeriod >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {comparisonStats.vsLastPeriod >= 0 ? '+' : ''}{comparisonStats.vsLastPeriod}%
                </p>
              </div>
              
              <div className="bg-secondary/50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-accent" />
                  <span className="text-sm text-muted-foreground">vs Global Avg</span>
                </div>
                <p className={`text-2xl font-bold ${comparisonStats.vsGlobalAvg >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {comparisonStats.vsGlobalAvg >= 0 ? '+' : ''}{comparisonStats.vsGlobalAvg}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {Math.round(globalStats.avgReduction * 100) / 100} kg
                </p>
              </div>
              
              <div className="bg-secondary/50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-sky-400" />
                  <span className="text-sm text-muted-foreground">Your Percentile</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  Top {100 - comparisonStats.percentile}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  of {globalStats.userCount} users
                </p>
              </div>
            </div>

            {/* Progress Over Time Chart */}
            <div className="bg-secondary/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Progress Over Time
              </h3>
              
              {progressData.length === 0 || progressData.every(d => d.yourReduction === 0) ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Not enough data yet. Keep logging your activities!
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={progressData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(152, 60%, 45%)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(152, 60%, 45%)" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 20%, 18%)" />
                    <XAxis 
                      dataKey="period" 
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
                        name === 'yourReduction' ? 'Your Reduction' : 'Global Average'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="yourReduction" 
                      stroke="hsl(152, 60%, 45%)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorProgress)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="globalAverage" 
                      stroke="hsl(38, 90%, 55%)" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    <ReferenceLine 
                      y={globalStats.avgReduction} 
                      stroke="hsl(38, 90%, 55%)" 
                      strokeDasharray="3 3"
                      label={{ value: 'Avg', fill: 'hsl(38, 90%, 55%)', fontSize: 10 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">Your Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-accent" style={{ borderStyle: 'dashed' }} />
                  <span className="text-sm text-muted-foreground">Global Average</span>
                </div>
              </div>
            </div>

            {/* Daily Trend Chart */}
            <div className="bg-secondary/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                {period === 'week' ? 'This Week' : 'This Month'} Daily Breakdown
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
