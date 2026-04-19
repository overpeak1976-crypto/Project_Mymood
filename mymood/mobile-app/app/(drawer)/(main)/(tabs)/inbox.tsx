import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { httpClient } from '../../../lib/httpClient';
import { Megaphone, UserPlus, Music, MailOpen, Play, Pause, Send } from 'lucide-react-native';
import { useToast } from '../../../context/ToastContext';
import { useAudio } from '../../../context/AudioContext';
import MiniPlayer from '@/components/MiniPlayer';

type Tab = 'notifications' | 'shared';

export default function InboxScreen() {
  const { showToast } = useToast();
  const { playSong, currentSong, isPlaying, togglePlayPause } = useAudio();
  const [activeTab, setActiveTab] = useState<Tab>('notifications');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sharedSongs, setSharedSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [notifData, inboxData] = await Promise.all([
        httpClient.get<any[]>('/api/notifications'),
        httpClient.get<any[]>('/api/inbox'),
      ]);
      setNotifications(notifData || []);
      setSharedSongs(inboxData || []);
    } catch (error: any) {
      console.error('Fetch Inbox Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const handlePressNotification = async (notificationId: string, isRead: boolean) => {
    if (isRead) return;
    setNotifications((prev) =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    try {
      await httpClient.put(`/api/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const unreadNotifCount = notifications.filter(n => !n.is_read).length;
  const unreadSharedCount = sharedSongs.filter((s: any) => s.status === 'unread').length;

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'admin_notice':
        return { icon: <Megaphone color="#EF4444" size={24} />, bg: '#FEE2E2' };
      case 'friend_request':
        return { icon: <UserPlus color="#3B82F6" size={24} />, bg: '#DBEAFE' };
      case 'song_share':
        return { icon: <Music color="#9333EA" size={24} />, bg: '#F3E8FF' };
      default:
        return { icon: <Megaphone color="#6B7280" size={24} />, bg: '#F3F4F6' };
    }
  };

  const renderNotificationItem = ({ item }: { item: any }) => {
    const { icon, bg } = getIconConfig(item.type);
    return (
      <TouchableOpacity
        onPress={() => handlePressNotification(item.id, item.is_read)}
        style={[s.notifRow, { backgroundColor: item.is_read ? '#fff' : '#FAF5FF' }]}
        activeOpacity={0.7}
      >
        <View style={[s.iconCircle, { backgroundColor: bg }]}>{icon}</View>
        <View style={s.notifContent}>
          <Text style={[s.notifTitle, !item.is_read && { fontWeight: '900' }]}>{item.title}</Text>
          <Text style={s.notifMsg} numberOfLines={2}>{item.message}</Text>
          <Text style={s.notifTime}>
            {new Date(item.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ', ' + new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        {!item.is_read && <View style={s.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const handlePlaySharedSong = (item: any) => {
    if (!item.song) return;
    const song = item.song;
    if (currentSong?.id === song.id && isPlaying) {
      togglePlayPause();
    } else {
      playSong(song, sharedSongs.map((s: any) => s.song).filter(Boolean));
    }
  };

  const renderSharedSongItem = ({ item }: { item: any }) => {
    const isActive = currentSong?.id === item.song?.id;
    const timeStr = new Date(item.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      + ', ' + new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
      <TouchableOpacity
        onPress={() => handlePlaySharedSong(item)}
        style={[s.sharedCard, isActive && { backgroundColor: '#FAF5FF', borderColor: '#DDD6FE' }]}
        activeOpacity={0.7}
      >
        {/* Sender row */}
        <View style={s.senderRow}>
          <Image
            source={{ uri: item.sender?.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.sender?.username || 'U')}&background=7C3AED&color=fff` }}
            style={s.senderAvatar}
          />
          <Text style={s.senderText}>
            {item.sender?.username || 'Unknown'} <Text style={{ fontWeight: '400', color: '#9CA3AF' }}>ส่งเพลงให้คุณ</Text>
          </Text>
          <Text style={s.sharedTime}>{timeStr}</Text>
        </View>

        {/* Song row */}
        <View style={s.songRow}>
          <View>
            <Image
              source={{ uri: item.song?.cover_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.song?.title || 'S')}&background=7C3AED&color=fff` }}
              style={s.songCover}
            />
            <View style={s.playOverlay}>
              {isActive && isPlaying ? (
                <Pause color="#fff" size={20} fill="#fff" />
              ) : (
                <Play color="#fff" size={20} fill="#fff" />
              )}
            </View>
          </View>

          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[s.songTitle, isActive && { color: '#7C3AED' }]} numberOfLines={1}>
              {item.song?.title || 'Unknown Song'}
            </Text>
            <Text style={s.songArtist} numberOfLines={1}>
              {item.song?.artist || 'Unknown Artist'}
            </Text>
          </View>

          {item.status === 'unread' && <View style={s.unreadDotSmall} />}
        </View>

        {item.message ? (
          <View style={s.msgBubble}>
            <Text style={s.msgText}>"{item.message}"</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.headerTitle}>Inbox</Text>
          <TouchableOpacity style={{ padding: 8 }}>
            <MailOpen color="#9333EA" size={22} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={s.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab('notifications')}
            style={[s.tab, activeTab === 'notifications' && s.tabActive]}
          >
            <Megaphone color={activeTab === 'notifications' ? '#7C3AED' : '#9CA3AF'} size={16} />
            <Text style={[s.tabText, activeTab === 'notifications' && s.tabTextActive]}>แจ้งเตือน</Text>
            {unreadNotifCount > 0 && (
              <View style={[s.badge, { backgroundColor: '#EF4444' }]}>
                <Text style={s.badgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('shared')}
            style={[s.tab, activeTab === 'shared' && s.tabActive]}
          >
            <Send color={activeTab === 'shared' ? '#7C3AED' : '#9CA3AF'} size={16} />
            <Text style={[s.tabText, activeTab === 'shared' && s.tabTextActive]}>เพลงจากเพื่อน</Text>
            {unreadSharedCount > 0 && (
              <View style={[s.badge, { backgroundColor: '#8B5CF6' }]}>
                <Text style={s.badgeText}>{unreadSharedCount > 9 ? '9+' : unreadSharedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#9333EA" />
          <Text style={{ color: '#6B7280', marginTop: 12, fontWeight: '500' }}>กำลังโหลด Inbox...</Text>
        </View>
      ) : activeTab === 'notifications' ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#9333EA"]} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Megaphone color="#E9D5FF" size={64} />
              <Text style={s.emptyTitle}>ยังไม่มีแจ้งเตือนใหม่</Text>
              <Text style={s.emptyDesc}>คุณจะเห็นแจ้งเตือนต่างๆ เช่น ประกาศจากแอดมิน หรือการขอเพิ่มเพื่อนที่นี่</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={sharedSongs}
          renderItem={renderSharedSongItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#9333EA"]} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Music color="#E9D5FF" size={64} />
              <Text style={s.emptyTitle}>ยังไม่มีเพลงจากเพื่อน</Text>
              <Text style={s.emptyDesc}>เมื่อเพื่อนส่งเพลงให้คุณ จะแสดงที่นี่ กดเล่นได้เลย!</Text>
            </View>
          }
        />
      )}
      <MiniPlayer/>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  // Header
  header: { backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', zIndex: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: '#7C3AED' },
  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabText: { fontWeight: '700', fontSize: 13, color: '#9CA3AF', marginLeft: 4 },
  tabTextActive: { color: '#7C3AED' },
  badge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Notification item
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  notifContent: { flex: 1, marginRight: 8 },
  notifTitle: { fontWeight: '700', color: '#111827', marginBottom: 4, fontSize: 14 },
  notifMsg: { color: '#4B5563', fontSize: 13, lineHeight: 20 },
  notifTime: { color: '#9CA3AF', fontSize: 11, marginTop: 8, fontWeight: '500' },
  unreadDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#7C3AED' },
  // Shared song card
  sharedCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#fff' },
  senderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  senderAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  senderText: { fontSize: 12, fontWeight: '600', color: '#4B5563', flex: 1 },
  sharedTime: { fontSize: 11, color: '#9CA3AF' },
  songRow: { flexDirection: 'row', alignItems: 'center' },
  songCover: { width: 56, height: 56, borderRadius: 12 },
  playOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  songTitle: { fontWeight: '700', fontSize: 14, color: '#111827', marginBottom: 2 },
  songArtist: { fontSize: 12, color: '#6B7280' },
  unreadDotSmall: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8B5CF6', marginLeft: 8 },
  msgBubble: { marginTop: 12, backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  msgText: { fontSize: 13, color: '#374151', fontStyle: 'italic' },
  // Empty
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#7C3AED', marginBottom: 8, marginTop: 20 },
  emptyDesc: { color: '#9CA3AF', textAlign: 'center', lineHeight: 20, fontSize: 14 },
});