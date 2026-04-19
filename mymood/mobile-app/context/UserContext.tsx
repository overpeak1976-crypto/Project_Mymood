import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { httpClient } from '../lib/httpClient';
import { Song } from './AudioContext';

interface UserProfile {
  id: string;
  username: string;
  handle: string;
  profile_image_url: string;
  banner_image_url: string;
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

      // Parallel fetch for profile and likes via httpClient (auto-auth)
      const [profileData, likesData] = await Promise.all([
        httpClient.get<UserProfile>('/api/users/profile'),
        httpClient.get<{ liked_songs: Array<{ songs: Song }> }>('/api/likes/my-likes')
      ]);

      if (profileData) {
        setProfile(profileData);
      }

      // Extract actual song data from nested structure
      const likeItems = likesData?.liked_songs || [];
      const songs = likeItems.map((item: any) => item.songs);
      setLikedSongs(songs);
      setLikedSongIds(new Set<string>(songs.map((s: any) => s.id)));
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsUserLoading(false);
    }
  }, []);

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
      const data = await httpClient.post<{ isLiked: boolean }>('/api/likes/toggle', { song_id: song.id });
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
