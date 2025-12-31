import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Loader2,
  UserMinus
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface UserSearchResult {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
}

interface FriendManagementProps {
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function FriendManagement({ open, onClose, onUpdate }: FriendManagementProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const fetchFriendships = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all friendships involving the user
      const { data, error } = await supabase
        .from('user_friends')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      // Get all unique user IDs we need profiles for
      const userIds = new Set<string>();
      data?.forEach(f => {
        if (f.user_id !== user.id) userIds.add(f.user_id);
        if (f.friend_id !== user.id) userIds.add(f.friend_id);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Categorize friendships
      const accepted: Friend[] = [];
      const pending: Friend[] = [];
      const sent: Friend[] = [];

      data?.forEach(f => {
        const otherUserId = f.user_id === user.id ? f.friend_id : f.user_id;
        const profile = profileMap.get(otherUserId);
        
        const friendData: Friend = {
          id: f.id,
          user_id: f.user_id,
          friend_id: f.friend_id,
          status: f.status,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
        };

        if (f.status === 'accepted') {
          accepted.push(friendData);
        } else if (f.status === 'pending') {
          if (f.friend_id === user.id) {
            pending.push(friendData); // Incoming request
          } else {
            sent.push(friendData); // Outgoing request
          }
        }
      });

      setFriends(accepted);
      setPendingRequests(pending);
      setSentRequests(sent);
    } catch (error) {
      console.error('Error fetching friendships:', error);
      toast.error('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchFriendships();
    }
  }, [open, user]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, city')
        .neq('user_id', user.id)
        .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('user_friends')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        toast.error('Friend request already exists');
        return;
      }

      const { error } = await supabase
        .from('user_friends')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Friend request sent!');
      fetchFriendships();
      setSearchResults(prev => prev.filter(r => r.user_id !== friendId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send request');
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('user_friends')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Friend request accepted!');
      fetchFriendships();
      onUpdate();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const rejectOrRemove = async (friendshipId: string, isRemove: boolean = false) => {
    try {
      const { error } = await supabase
        .from('user_friends')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success(isRemove ? 'Friend removed' : 'Request declined');
      fetchFriendships();
      onUpdate();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Action failed');
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isAlreadyFriend = (userId: string) => {
    return friends.some(f => f.user_id === userId || f.friend_id === userId) ||
           sentRequests.some(f => f.friend_id === userId) ||
           pendingRequests.some(f => f.user_id === userId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Manage Friends
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="add">
              Add
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="friends" className="mt-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No friends yet</p>
                  <p className="text-sm">Search for users to add friends!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map(friend => (
                    <div key={friend.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                          {getInitials(friend.display_name)}
                        </div>
                      )}
                      <span className="flex-1 font-medium truncate">{friend.display_name || 'Anonymous'}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => rejectOrRemove(friend.id, true)}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="mt-0 space-y-4">
              {pendingRequests.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Incoming Requests</h4>
                  <div className="space-y-2">
                    {pendingRequests.map(request => (
                      <div key={request.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        {request.avatar_url ? (
                          <img src={request.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                            {getInitials(request.display_name)}
                          </div>
                        )}
                        <span className="flex-1 font-medium truncate">{request.display_name || 'Anonymous'}</span>
                        <Button variant="ghost" size="sm" className="text-primary" onClick={() => acceptRequest(request.id)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => rejectOrRemove(request.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sentRequests.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Sent Requests</h4>
                  <div className="space-y-2">
                    {sentRequests.map(request => (
                      <div key={request.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        {request.avatar_url ? (
                          <img src={request.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                            {getInitials(request.display_name)}
                          </div>
                        )}
                        <span className="flex-1 font-medium truncate">{request.display_name || 'Anonymous'}</span>
                        <span className="text-xs text-muted-foreground">Pending</span>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => rejectOrRemove(request.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingRequests.length === 0 && sentRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No pending requests</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="add" className="mt-0 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              <div className="space-y-2">
                {searchResults.map(result => (
                  <div key={result.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    {result.avatar_url ? (
                      <img src={result.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                        {getInitials(result.display_name || result.username)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.display_name || result.username || 'Anonymous'}</p>
                      {result.city && <p className="text-xs text-muted-foreground">{result.city}</p>}
                    </div>
                    {isAlreadyFriend(result.user_id) ? (
                      <span className="text-xs text-muted-foreground">Added</span>
                    ) : (
                      <Button size="sm" onClick={() => sendFriendRequest(result.user_id)}>
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
