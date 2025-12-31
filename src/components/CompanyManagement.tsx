import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Building2, 
  Search, 
  Plus,
  Loader2,
  LogOut,
  Users
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  member_count: number;
  total_carbon_saved: number;
}

interface UserCompany {
  company_id: string;
  role: string;
  company: Company;
}

interface CompanyManagementProps {
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CompanyManagement({ open, onClose, onUpdate }: CompanyManagementProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-company');
  const [myCompany, setMyCompany] = useState<UserCompany | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const fetchMyCompany = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select(`
          company_id,
          role,
          companies (
            id,
            name,
            logo_url,
            member_count,
            total_carbon_saved
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.companies) {
        setMyCompany({
          company_id: data.company_id,
          role: data.role || 'member',
          company: data.companies as unknown as Company
        });
      } else {
        setMyCompany(null);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchMyCompany();
    }
  }, [open, user]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error searching companies:', error);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const createCompany = async () => {
    if (!newCompanyName.trim() || !user) return;
    setCreating(true);

    try {
      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: newCompanyName.trim(),
          member_count: 1
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Join as admin
      const { error: joinError } = await supabase
        .from('user_companies')
        .insert({
          user_id: user.id,
          company_id: company.id,
          role: 'admin'
        });

      if (joinError) throw joinError;

      toast.success('Company created!');
      setNewCompanyName('');
      fetchMyCompany();
      onUpdate();
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error('Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  const joinCompany = async (companyId: string) => {
    if (!user) return;
    setJoining(companyId);

    try {
      // Leave current company if any
      if (myCompany) {
        await supabase
          .from('user_companies')
          .delete()
          .eq('user_id', user.id);

        // Update old company member count
        await supabase
          .from('companies')
          .update({ member_count: Math.max(0, (myCompany.company.member_count || 1) - 1) })
          .eq('id', myCompany.company_id);
      }

      // Join new company
      const { error } = await supabase
        .from('user_companies')
        .insert({
          user_id: user.id,
          company_id: companyId,
          role: 'member'
        });

      if (error) throw error;

      // Update new company member count
      const company = companies.find(c => c.id === companyId);
      if (company) {
        await supabase
          .from('companies')
          .update({ member_count: (company.member_count || 0) + 1 })
          .eq('id', companyId);
      }

      toast.success('Joined company!');
      fetchMyCompany();
      onUpdate();
      setCompanies([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Error joining company:', error);
      toast.error('Failed to join company');
    } finally {
      setJoining(null);
    }
  };

  const leaveCompany = async () => {
    if (!user || !myCompany) return;

    try {
      const { error } = await supabase
        .from('user_companies')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      // Update member count
      await supabase
        .from('companies')
        .update({ member_count: Math.max(0, (myCompany.company.member_count || 1) - 1) })
        .eq('id', myCompany.company_id);

      toast.success('Left company');
      setMyCompany(null);
      onUpdate();
    } catch (error) {
      console.error('Error leaving company:', error);
      toast.error('Failed to leave company');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-company">My Company</TabsTrigger>
            <TabsTrigger value="join">Join</TabsTrigger>
            <TabsTrigger value="create">Create</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="my-company" className="mt-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : myCompany ? (
                <div className="space-y-4">
                  <div className="p-6 rounded-xl bg-gradient-card border border-border text-center">
                    {myCompany.company.logo_url ? (
                      <img 
                        src={myCompany.company.logo_url} 
                        alt={myCompany.company.name} 
                        className="w-16 h-16 rounded-xl mx-auto mb-3 object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-accent mx-auto mb-3 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-accent-foreground" />
                      </div>
                    )}
                    <h3 className="text-xl font-bold">{myCompany.company.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">Role: {myCompany.role}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-lg font-bold">{myCompany.company.member_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Members</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-lg font-bold">{myCompany.company.total_carbon_saved?.toFixed(1) || 0} kg</p>
                        <p className="text-xs text-muted-foreground">CO₂ Saved</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full text-destructive hover:text-destructive gap-2"
                    onClick={leaveCompany}
                  >
                    <LogOut className="w-4 h-4" />
                    Leave Company
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>You're not in a company</p>
                  <p className="text-sm">Join or create one to compete!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="join" className="mt-0 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              <div className="space-y-2">
                {companies.map(company => (
                  <div key={company.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-accent flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-accent-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{company.name}</p>
                      <p className="text-xs text-muted-foreground">{company.member_count || 0} members</p>
                    </div>
                    {myCompany?.company_id === company.id ? (
                      <span className="text-xs text-primary">Joined</span>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => joinCompany(company.id)}
                        disabled={joining === company.id}
                      >
                        {joining === company.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Join'
                        )}
                      </Button>
                    )}
                  </div>
                ))}

                {companies.length === 0 && searchQuery && !searching && (
                  <p className="text-center text-muted-foreground py-4">No companies found</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="create" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter company name..."
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button 
                  className="w-full gap-2" 
                  onClick={createCompany}
                  disabled={creating || !newCompanyName.trim()}
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Company
                </Button>

                {myCompany && (
                  <p className="text-sm text-muted-foreground text-center">
                    Note: Creating a new company will remove you from your current one.
                  </p>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
