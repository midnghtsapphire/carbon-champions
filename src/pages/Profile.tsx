import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Leaf, 
  ArrowLeft,
  Camera,
  TrendingDown,
  Flame,
  Trophy,
  Target,
  Calendar,
  MapPin,
  Save,
  Loader2
} from 'lucide-react';

interface ProfileData {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  total_carbon_saved: number;
  current_streak: number;
  longest_streak: number;
  level: number;
  xp_points: number;
  created_at: string;
}

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  // Stats
  const [achievementCount, setAchievementCount] = useState(0);
  const [totalAchievements, setTotalAchievements] = useState(0);
  const [challengesCompleted, setChallengesCompleted] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setCity(data.city || '');
        setCountry(data.country || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get achievement counts
      const { count: userAchCount } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: totalAchCount } = await supabase
        .from('achievements')
        .select('*', { count: 'exact', head: true });

      setAchievementCount(userAchCount || 0);
      setTotalAchievements(totalAchCount || 0);

      // Get completed challenges count
      const { count: completedCount } = await supabase
        .from('user_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);

      setChallengesCompleted(completedCount || 0);

      // Get total entries count
      const { count: entriesCount } = await supabase
        .from('carbon_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setTotalEntries(entriesCount || 0);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Avatar updated!');
      fetchProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getXpForNextLevel = (level: number) => {
    return level * 500;
  };

  const getXpProgress = () => {
    if (!profile) return 0;
    const currentLevelXp = (profile.level - 1) * 500;
    const nextLevelXp = profile.level * 500;
    const progress = ((profile.xp_points - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  if (loading || loadingProfile) {
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
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">CarbonZero</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Your Profile</h1>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column - Avatar & Basic Info */}
          <div className="md:col-span-1">
            <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-6 text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-4 border-primary/20">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-primary text-primary-foreground">
                      {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>

              <h2 className="text-xl font-bold text-foreground">
                {profile?.display_name || 'Eco Warrior'}
              </h2>
              <p className="text-muted-foreground text-sm">{user?.email}</p>

              {profile?.city || profile?.country ? (
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-2">
                  <MapPin className="w-4 h-4" />
                  {[profile.city, profile.country].filter(Boolean).join(', ')}
                </div>
              ) : null}

              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-2">
                <Calendar className="w-4 h-4" />
                Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
              </div>

              {/* Level Progress */}
              <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Level {profile?.level || 1}</span>
                  <span className="text-sm text-muted-foreground">{profile?.xp_points || 0} XP</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-primary h-2 rounded-full transition-all"
                    style={{ width: `${getXpProgress()}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getXpForNextLevel(profile?.level || 1) - (profile?.xp_points || 0)} XP to Level {(profile?.level || 1) + 1}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Edit Form & Stats */}
          <div className="md:col-span-2 space-y-6">
            {/* Edit Profile Form */}
            <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Edit Profile</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself and your eco journey..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Your city"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Your country"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="w-full gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Complete Stats */}
            <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Your Impact Stats</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{profile?.total_carbon_saved || 0} kg</p>
                  <p className="text-sm text-muted-foreground">Total CO₂ Reduced</p>
                </div>

                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-accent" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{profile?.current_streak || 0} days</p>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </div>

                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{profile?.longest_streak || 0} days</p>
                  <p className="text-sm text-muted-foreground">Longest Streak</p>
                </div>

                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-sky-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{achievementCount}/{totalAchievements}</p>
                  <p className="text-sm text-muted-foreground">Achievements Unlocked</p>
                </div>

                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{challengesCompleted}</p>
                  <p className="text-sm text-muted-foreground">Challenges Completed</p>
                </div>

                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                      <Leaf className="w-5 h-5 text-teal-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{totalEntries}</p>
                  <p className="text-sm text-muted-foreground">Total Entries Logged</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
