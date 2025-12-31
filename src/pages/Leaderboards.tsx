import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Leaf, 
  ArrowLeft, 
  Trophy, 
  Users, 
  Building2, 
  MapPin, 
  Globe, 
  Flame,
  Medal,
  Wifi,
  UserPlus,
  Search,
  Loader2
} from 'lucide-react';
import FriendManagement from '@/components/FriendManagement';
import CompanyManagement from '@/components/CompanyManagement';

interface WeeklyEntry {
  user_id: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  weekly_reduction: number | null;
  current_streak: number | null;
}

interface FriendEntry {
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  total_carbon_saved: number | null;
  current_streak: number | null;
  level: number | null;
}

interface CityEntry {
  city: string | null;
  total_carbon_saved: number | null;
  avg_carbon_saved: number | null;
  member_count: number | null;
}

interface CompanyEntry {
  id: string | null;
  name: string | null;
  logo_url: string | null;
  total_carbon_saved: number | null;
  avg_carbon_saved: number | null;
  member_count: number | null;
}

export default function Leaderboards() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('global');
  const [isLive, setIsLive] = useState(false);
  
  // Leaderboard data
  const [globalData, setGlobalData] = useState<WeeklyEntry[]>([]);
  const [friendsData, setFriendsData] = useState<FriendEntry[]>([]);
  const [cityData, setCityData] = useState<CityEntry[]>([]);
  const [companyData, setCompanyData] = useState<CompanyEntry[]>([]);
  
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingCity, setLoadingCity] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);

  // Management dialogs
  const [showFriendManagement, setShowFriendManagement] = useState(false);
  const [showCompanyManagement, setShowCompanyManagement] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchGlobalLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_leaderboard')
        .select('*')
        .order('weekly_reduction', { ascending: false })
        .limit(50);

      if (error) throw error;
      setGlobalData(data || []);
    } catch (error) {
      console.error('Error fetching global leaderboard:', error);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const fetchFriendsLeaderboard = async () => {
    if (!user) return;
    
    try {
      // Get friend IDs
      const { data: friendships } = await supabase
        .from('user_friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      // Include current user
      const allIds = [...friendIds, user.id];

      if (allIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, city, total_carbon_saved, current_streak, level')
          .in('user_id', allIds)
          .order('total_carbon_saved', { ascending: false });

        if (error) throw error;
        setFriendsData(data || []);
      }
    } catch (error) {
      console.error('Error fetching friends leaderboard:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const fetchCityLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('city_leaderboard')
        .select('*')
        .order('total_carbon_saved', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCityData(data || []);
    } catch (error) {
      console.error('Error fetching city leaderboard:', error);
    } finally {
      setLoadingCity(false);
    }
  };

  const fetchCompanyLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('company_leaderboard')
        .select('*')
        .order('total_carbon_saved', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCompanyData(data || []);
    } catch (error) {
      console.error('Error fetching company leaderboard:', error);
    } finally {
      setLoadingCompany(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGlobalLeaderboard();
      fetchFriendsLeaderboard();
      fetchCityLeaderboard();
      fetchCompanyLeaderboard();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('leaderboard-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'carbon_entries' }, () => {
          fetchGlobalLeaderboard();
          fetchFriendsLeaderboard();
          fetchCityLeaderboard();
          fetchCompanyLeaderboard();
        })
        .subscribe((status) => {
          setIsLive(status === 'SUBSCRIBED');
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatValue = (value: number | null) => {
    if (value === null || value === 0) return '0';
    return value.toFixed(1);
  };

  const renderUserLeaderboard = (data: (WeeklyEntry | FriendEntry)[], isWeekly: boolean = false) => (
    <div className="space-y-2">
      {data.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No entries yet</p>
        </div>
      ) : (
        data.map((entry, index) => (
          <div
            key={entry.user_id || index}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-secondary/50 ${
              index === 0 ? 'bg-accent/10 border border-accent/20' : 'bg-card/50'
            } ${entry.user_id === user?.id ? 'ring-2 ring-primary/50' : ''}`}
          >
            {/* Rank */}
            <div className="w-10 flex justify-center">
              {index === 0 ? (
                <Medal className="w-6 h-6 text-accent" />
              ) : index === 1 ? (
                <Medal className="w-6 h-6 text-muted-foreground" />
              ) : index === 2 ? (
                <Medal className="w-6 h-6 text-amber-700" />
              ) : (
                <span className="text-muted-foreground font-bold text-lg">{index + 1}</span>
              )}
            </div>

            {/* Avatar */}
            {entry.avatar_url ? (
              <img 
                src={entry.avatar_url} 
                alt={entry.display_name || 'User'} 
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                index === 0 ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground'
              }`}>
                {getInitials(entry.display_name)}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                {entry.display_name || 'Anonymous'}
                {entry.user_id === user?.id && <span className="text-primary ml-2">(You)</span>}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {entry.city || 'Earth'}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm" title="Current streak">
                <Flame className="w-4 h-4 text-accent" />
                <span>{entry.current_streak || 0}</span>
              </div>
              <div className="text-right min-w-[80px]">
                <p className="font-bold text-primary">
                  {isWeekly 
                    ? `-${formatValue((entry as WeeklyEntry).weekly_reduction)} kg`
                    : `${formatValue((entry as FriendEntry).total_carbon_saved)} kg`
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  {isWeekly ? 'this week' : 'total'}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderCityLeaderboard = () => (
    <div className="space-y-2">
      {cityData.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No city data yet</p>
          <p className="text-sm text-muted-foreground/70">Add your city in your profile to participate!</p>
        </div>
      ) : (
        cityData.map((city, index) => (
          <div
            key={city.city || index}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-secondary/50 ${
              index === 0 ? 'bg-accent/10 border border-accent/20' : 'bg-card/50'
            }`}
          >
            <div className="w-10 flex justify-center">
              {index === 0 ? (
                <Medal className="w-6 h-6 text-accent" />
              ) : index === 1 ? (
                <Medal className="w-6 h-6 text-muted-foreground" />
              ) : index === 2 ? (
                <Medal className="w-6 h-6 text-amber-700" />
              ) : (
                <span className="text-muted-foreground font-bold text-lg">{index + 1}</span>
              )}
            </div>

            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{city.city || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">{city.member_count || 0} members</p>
            </div>

            <div className="text-right">
              <p className="font-bold text-primary">{formatValue(city.total_carbon_saved)} kg</p>
              <p className="text-xs text-muted-foreground">
                ~{formatValue(city.avg_carbon_saved)} avg
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderCompanyLeaderboard = () => (
    <div className="space-y-2">
      {companyData.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No companies yet</p>
          <p className="text-sm text-muted-foreground/70">Create or join a company to compete!</p>
        </div>
      ) : (
        companyData.map((company, index) => (
          <div
            key={company.id || index}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-secondary/50 ${
              index === 0 ? 'bg-accent/10 border border-accent/20' : 'bg-card/50'
            }`}
          >
            <div className="w-10 flex justify-center">
              {index === 0 ? (
                <Medal className="w-6 h-6 text-accent" />
              ) : index === 1 ? (
                <Medal className="w-6 h-6 text-muted-foreground" />
              ) : index === 2 ? (
                <Medal className="w-6 h-6 text-amber-700" />
              ) : (
                <span className="text-muted-foreground font-bold text-lg">{index + 1}</span>
              )}
            </div>

            {company.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name || 'Company'} 
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center">
                <Building2 className="w-6 h-6 text-accent-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{company.name || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">{company.member_count || 0} members</p>
            </div>

            <div className="text-right">
              <p className="font-bold text-primary">{formatValue(company.total_carbon_saved)} kg</p>
              <p className="text-xs text-muted-foreground">
                ~{formatValue(company.avg_carbon_saved)} avg
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center animate-pulse">
          <Leaf className="w-7 h-7 text-primary-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              isLive 
                ? 'bg-primary/10 text-primary' 
                : 'bg-muted/50 text-muted-foreground'
            }`}>
              <Wifi className={`w-3 h-3 ${isLive ? 'animate-pulse' : ''}`} />
              {isLive ? 'Live' : 'Connecting...'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Trophy className="w-8 h-8 text-accent" />
              Leaderboards
            </h1>
            <p className="text-muted-foreground mt-1">Compete with friends, cities, and companies</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="global" className="gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Global</span>
            </TabsTrigger>
            <TabsTrigger value="friends" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Friends</span>
            </TabsTrigger>
            <TabsTrigger value="city" className="gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Cities</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Companies</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-0">
            <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">This Week's Top Players</h2>
              </div>
              {loadingGlobal ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                renderUserLeaderboard(globalData, true)
              )}
            </div>
          </TabsContent>

          <TabsContent value="friends" className="mt-0">
            <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Friends Leaderboard</h2>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFriendManagement(true)}>
                  <UserPlus className="w-4 h-4" />
                  Manage Friends
                </Button>
              </div>
              {loadingFriends ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                renderUserLeaderboard(friendsData, false)
              )}
            </div>
          </TabsContent>

          <TabsContent value="city" className="mt-0">
            <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">City Rankings</h2>
              </div>
              {loadingCity ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                renderCityLeaderboard()
              )}
            </div>
          </TabsContent>

          <TabsContent value="company" className="mt-0">
            <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Company Rankings</h2>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowCompanyManagement(true)}>
                  <Building2 className="w-4 h-4" />
                  Manage Company
                </Button>
              </div>
              {loadingCompany ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                renderCompanyLeaderboard()
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <FriendManagement 
        open={showFriendManagement} 
        onClose={() => setShowFriendManagement(false)}
        onUpdate={fetchFriendsLeaderboard}
      />
      
      <CompanyManagement
        open={showCompanyManagement}
        onClose={() => setShowCompanyManagement(false)}
        onUpdate={fetchCompanyLeaderboard}
      />
    </div>
  );
}
