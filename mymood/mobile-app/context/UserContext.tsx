import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Song } from './AudioContext';

interface UserProfile {
  id: string;
  username: string;
  handle: string;
  profile_image_url: string;
}

interface UserContextType {
  profile: UserProfile | null;
  likedSongs: Song[];
  likedSongIds: Set<string>;
  isUserLoading: boolean;
  toggleLike: (song: Song) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
  const [isUserLoading, setIsUserLoading] = useState(true);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const fetchUserData = useCallback(async () => {
    try {
      setIsUserLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setProfile(null);
        setLikedSongs([]);
        setLikedSongIds(new Set());
        return;
      }

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Parallel fetch for profile and likes
      const [profileRes, likesRes] = await Promise.all([
        supabase.from('users').select('id, username, handle, profile_image_url').eq('id', session.user.id).maybeSingle(),
        fetch(`${BACKEND_URL}/api/likes/my-likes`, { headers })
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as UserProfile);
      }

      if (likesRes.ok) {
        const likesData = await likesRes.json();
        const songs = likesData.liked_songs || [];
        setLikedSongs(songs);
        setLikedSongIds(new Set<string>(songs.map((s: any) => s.id)));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsUserLoading(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    fetchUserData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        fetchUserData();
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLikedSongs([]);
        setLikedSongIds(new Set());
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const toggleLike = async (song: Song) => {
    const isCurrentlyLiked = likedSongIds.has(song.id);

    setLikedSongIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyLiked) next.delete(song.id);
      else next.add(song.id);
      return next;
    });

    setLikedSongs(prev => {
      if (isCurrentlyLiked) {
        return prev.filter(s => s.id !== song.id);
      } else {
        if (prev.find(s => s.id === song.id)) return prev;
        return [song, ...prev];
      }
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${BACKEND_URL}/api/likes/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ song_id: song.id })
      });

      if (!res.ok) throw new Error('Failed to toggle like on server');

      const data = await res.json();
      setLikedSongIds(prev => {
        const next = new Set(prev);
        data.isLiked ? next.add(song.id) : next.delete(song.id);
        return next;
      });

      if (!data.isLiked) {
        setLikedSongs(prev => prev.filter(s => s.id !== song.id));
      } else {
        setLikedSongs(prev => {
          if (prev.find(s => s.id === song.id)) return prev;
          return [song, ...prev];
        });
      }

    } catch (error) {
      console.error('Toggle like error:', error);
      setLikedSongIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyLiked) next.add(song.id);
        else next.delete(song.id);
        return next;
      });

      setLikedSongs(prev => {
        if (isCurrentlyLiked) {
          if (prev.find(s => s.id === song.id)) return prev;
          return [song, ...prev];
        } else {
          return prev.filter(s => s.id !== song.id);
        }
      });
    }
  };

  const value = {
    profile,
    likedSongs,
    likedSongIds,
    isUserLoading,
    toggleLike,
    refreshUserData: fetchUserData
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
