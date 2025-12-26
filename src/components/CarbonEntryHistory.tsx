import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Car, 
  Utensils, 
  Zap, 
  ShoppingBag,
  Calendar,
  Trash2,
  Pencil,
  TrendingDown,
  TrendingUp,
  Filter,
  X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CarbonEntry {
  id: string;
  category: string;
  activity: string;
  carbon_amount: number;
  is_reduction: boolean;
  entry_date: string;
  notes: string | null;
  created_at: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  transport: <Car className="w-4 h-4" />,
  food: <Utensils className="w-4 h-4" />,
  energy: <Zap className="w-4 h-4" />,
  shopping: <ShoppingBag className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  transport: 'bg-blue-500/20 text-blue-400',
  food: 'bg-green-500/20 text-green-400',
  energy: 'bg-yellow-500/20 text-yellow-400',
  shopping: 'bg-purple-500/20 text-purple-400',
};

interface CarbonEntryHistoryProps {
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function CarbonEntryHistory({ open, onClose, onUpdate }: CarbonEntryHistoryProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CarbonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Edit state
  const [editingEntry, setEditingEntry] = useState<CarbonEntry | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Delete state
  const [deletingEntry, setDeletingEntry] = useState<CarbonEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchEntries();
    }
  }, [open, user, categoryFilter, dateFrom, dateTo]);

  const fetchEntries = async () => {
    if (!user) return;
    setLoading(true);

    try {
      let query = supabase
        .from('carbon_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (dateFrom) {
        query = query.gte('entry_date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('entry_date', dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast({
        title: "Error",
        description: "Failed to load entries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: CarbonEntry) => {
    setEditingEntry(entry);
    setEditAmount(entry.carbon_amount.toString());
    setEditNotes(entry.notes || '');
  };

  const saveEdit = async () => {
    if (!editingEntry || !user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('carbon_entries')
        .update({
          carbon_amount: parseFloat(editAmount),
          notes: editNotes || null,
        })
        .eq('id', editingEntry.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Entry updated",
        description: "Your carbon entry has been updated.",
      });

      setEditingEntry(null);
      fetchEntries();
      onUpdate?.();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast({
        title: "Error",
        description: "Failed to update entry.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingEntry || !user) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('carbon_entries')
        .delete()
        .eq('id', deletingEntry.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Entry deleted",
        description: "Your carbon entry has been removed.",
      });

      setDeletingEntry(null);
      fetchEntries();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setCategoryFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  // Calculate stats
  const totalReduced = entries
    .filter(e => e.is_reduction)
    .reduce((sum, e) => sum + Number(e.carbon_amount), 0);
  
  const totalEmitted = entries
    .filter(e => !e.is_reduction)
    .reduce((sum, e) => sum + Number(e.carbon_amount), 0);

  const categoryBreakdown = entries.reduce((acc, entry) => {
    const cat = entry.category;
    if (!acc[cat]) {
      acc[cat] = { reduced: 0, emitted: 0, count: 0 };
    }
    if (entry.is_reduction) {
      acc[cat].reduced += Number(entry.carbon_amount);
    } else {
      acc[cat].emitted += Number(entry.carbon_amount);
    }
    acc[cat].count += 1;
    return acc;
  }, {} as Record<string, { reduced: number; emitted: number; count: number }>);

  const hasFilters = categoryFilter !== 'all' || dateFrom || dateTo;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] bg-card border-border overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="w-5 h-5 text-primary" />
              Carbon Entry History
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              View, filter, and manage your logged carbon activities.
            </DialogDescription>
          </DialogHeader>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-3 py-3">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-primary text-sm mb-1">
                <TrendingDown className="w-4 h-4" />
                CO₂ Saved
              </div>
              <p className="text-xl font-bold text-foreground">{totalReduced.toFixed(1)} kg</p>
            </div>
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-accent text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                CO₂ Emitted
              </div>
              <p className="text-xl font-bold text-foreground">{totalEmitted.toFixed(1)} kg</p>
            </div>
          </div>

          {/* Category Breakdown */}
          {Object.keys(categoryBreakdown).length > 0 && (
            <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
              {Object.entries(categoryBreakdown).map(([cat, data]) => (
                <div 
                  key={cat}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${CATEGORY_COLORS[cat] || 'bg-secondary text-foreground'}`}
                >
                  {CATEGORY_ICONS[cat]}
                  <span className="capitalize font-medium">{cat}</span>
                  <span className="opacity-70">({data.count})</span>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px] h-9 bg-secondary/50 border-border">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="energy">Energy</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
              className="w-[140px] h-9 bg-secondary/50 border-border"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              className="w-[140px] h-9 bg-secondary/50 border-border"
            />
            
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-muted-foreground">
                <X className="w-3 h-3" />
                Clear
              </Button>
            )}
          </div>

          {/* Entries List */}
          <div className="flex-1 overflow-y-auto space-y-2 py-3 min-h-[200px]">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-32" />
                        <div className="h-3 bg-muted rounded w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No entries found</p>
                <p className="text-sm text-muted-foreground/70">
                  {hasFilters ? 'Try adjusting your filters' : 'Start logging your carbon activities!'}
                </p>
              </div>
            ) : (
              entries.map((entry) => (
                <div 
                  key={entry.id}
                  className="bg-secondary/30 hover:bg-secondary/50 rounded-lg p-4 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${CATEGORY_COLORS[entry.category] || 'bg-secondary text-foreground'}`}>
                      {CATEGORY_ICONS[entry.category] || <Zap className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{entry.activity}</p>
                          <p className="text-xs text-muted-foreground capitalize">{entry.category}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${entry.is_reduction ? 'text-primary' : 'text-accent'}`}>
                            {entry.is_reduction ? '-' : '+'}{Number(entry.carbon_amount).toFixed(2)} kg
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.entry_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">"{entry.notes}"</p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(entry)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingEntry(entry)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground flex-1">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </p>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(isOpen) => !isOpen && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Entry</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the carbon amount or notes for this entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Carbon Amount (kg)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes..."
                className="bg-secondary/50 border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
            <Button variant="hero" onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEntry} onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Entry</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this carbon entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
