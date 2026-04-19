import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  ArrowLeft, Users, Music, Heart, ListMusic, Play,
  ImageOff, Loader2, Shield, ShieldOff, ShieldAlert, Clock,
} from 'lucide-react';

interface UserDetail {
  id: string;
  username: string;
  handle: string;
  email: string;
  created_at: string;
  last_active: string | null;
  is_online: boolean;
  role: string;
  profile_image_url: string | null;
  banner_image_url: string | null;
  bio: string | null;
  link: string | null;
  _count: {
    songs_songs_uploaded_byTousers: number;
    liked_songs: number;
    playlists: number;
    play_history: number;
  };
  play_history: Array<{
    played_at: string;
    songs: { id: string; title: string; artist: string; cover_image_url: string | null } | null;
  }>;
  uploads: Array<{
    id: string;
    title: string;
    artist: string;
    cover_image_url: string | null;
    play_count: number;
    created_at: string;
    is_public: boolean;
  }>;
}

export default function UserDetailPage({ token }: { token: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'uploads'>('history');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api(token).get(`/users/${id}`);
        setUser(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, id]);

  const handleRoleChange = async (newRole: string) => {
    if (!user || !window.confirm(`เปลี่ยนสิทธิ์เป็น "${newRole}"?`)) return;
    setActionLoading(true);
    try {
      await api(token).patch(`/users/${user.id}/role`, { role: newRole });
      setUser({ ...user, role: newRole });
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearImage = async (type: 'profile-image' | 'banner-image') => {
    if (!user) return;
    const label = type === 'profile-image' ? 'รูปโปรไฟล์' : 'แบนเนอร์';
    if (!window.confirm(`ลบ${label}ของ @${user.handle}?`)) return;
    setActionLoading(true);
    try {
      await api(token).delete(`/users/${user.id}/${type}`);
      if (type === 'profile-image') setUser({ ...user, profile_image_url: null });
      else setUser({ ...user, banner_image_url: null });
      alert(`ลบ${label}สำเร็จ`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>ไม่พบข้อมูลผู้ใช้</p>
        <button onClick={() => navigate('/users')} className="mt-4 text-purple-600 font-medium">← กลับ</button>
      </div>
    );
  }

  const roleBadgeColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    user: 'bg-gray-100 text-gray-600',
    banned: 'bg-red-100 text-red-700',
    suspended: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate('/users')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> กลับไปหน้าจัดการผู้ใช้
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {/* Banner */}
        <div className="h-36 bg-gradient-to-r from-purple-400 to-indigo-400 relative">
          {user.banner_image_url && (
            <img src={user.banner_image_url} alt="" className="w-full h-full object-cover" />
          )}
          {user.banner_image_url && (
            <button
              onClick={() => handleClearImage('banner-image')}
              className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-red-600 font-medium hover:bg-white transition-colors"
            >
              <ImageOff className="w-3.5 h-3.5 inline mr-1" /> ลบแบนเนอร์
            </button>
          )}
        </div>

        {/* Info */}
        <div className="px-6 pb-6 -mt-12 relative">
          <div className="flex items-end gap-4 mb-4">
            <div className="relative">
              <div className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden border-4 border-white shadow-lg">
                {user.profile_image_url ? (
                  <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                    <Users className="w-10 h-10" />
                  </div>
                )}
              </div>
              {user.is_online && (
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-3 border-white rounded-full" />
              )}
            </div>

            <div className="flex-1 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-gray-800">{user.username}</h2>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${roleBadgeColor[user.role || 'user'] || roleBadgeColor.user}`}>
                  {user.role || 'user'}
                </span>
              </div>
              <p className="text-gray-400 text-sm">@{user.handle}</p>
            </div>
          </div>

          {user.bio && <p className="text-gray-600 text-sm mb-3">{user.bio}</p>}

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
            <span>📧 {user.email}</span>
            <span>📅 สมัคร: {new Date(user.created_at).toLocaleDateString('th-TH')}</span>
            {user.last_active && <span>🕒 ใช้งานล่าสุด: {new Date(user.last_active).toLocaleString('th-TH')}</span>}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Music className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{user._count.songs_songs_uploaded_byTousers}</p>
              <p className="text-xs text-gray-500">อัปโหลด</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{user._count.liked_songs}</p>
              <p className="text-xs text-gray-500">ถูกใจ</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <ListMusic className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{user._count.playlists}</p>
              <p className="text-xs text-gray-500">เพลย์ลิสต์</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Play className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{user._count.play_history}</p>
              <p className="text-xs text-gray-500">ประวัติฟัง</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {user.profile_image_url && (
              <button
                onClick={() => handleClearImage('profile-image')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors"
              >
                <ImageOff className="w-4 h-4" /> ลบรูปโปรไฟล์
              </button>
            )}
            {user.role !== 'banned' && (
              <button
                onClick={() => handleRoleChange('banned')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors"
              >
                <ShieldAlert className="w-4 h-4" /> แบน
              </button>
            )}
            {user.role !== 'suspended' && (
              <button
                onClick={() => handleRoleChange('suspended')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-lg font-medium transition-colors"
              >
                <ShieldOff className="w-4 h-4" /> ระงับชั่วคราว
              </button>
            )}
            {(user.role === 'banned' || user.role === 'suspended') && (
              <button
                onClick={() => handleRoleChange('user')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-lg font-medium transition-colors"
              >
                <Shield className="w-4 h-4" /> คืนสิทธิ์
              </button>
            )}
            {user.role !== 'admin' && (
              <button
                onClick={() => handleRoleChange('admin')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg font-medium transition-colors"
              >
                <Shield className="w-4 h-4" /> ให้เป็น Admin
              </button>
            )}
            {actionLoading && <Loader2 className="w-5 h-5 animate-spin text-gray-400 self-center" />}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
        >
          <Clock className="w-4 h-4 inline mr-1.5" />ประวัติการฟัง
        </button>
        <button
          onClick={() => setActiveTab('uploads')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'uploads' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
        >
          <Music className="w-4 h-4 inline mr-1.5" />เพลงที่อัปโหลด
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {activeTab === 'history' && (
          <div className="divide-y divide-gray-50">
            {user.play_history.length === 0 ? (
              <div className="p-12 text-center text-gray-400">ไม่มีประวัติการฟัง</div>
            ) : (
              user.play_history.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {item.songs?.cover_image_url ? (
                      <img src={item.songs.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="w-5 h-5" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{item.songs?.title || 'เพลงถูกลบ'}</p>
                    <p className="text-xs text-gray-400">{item.songs?.artist}</p>
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(item.played_at).toLocaleString('th-TH')}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'uploads' && (
          <div className="divide-y divide-gray-50">
            {user.uploads.length === 0 ? (
              <div className="p-12 text-center text-gray-400">ยังไม่มีเพลงที่อัปโหลด</div>
            ) : (
              user.uploads.map((song) => (
                <div key={song.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {song.cover_image_url ? (
                      <img src={song.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="w-5 h-5" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{song.title}</p>
                    <p className="text-xs text-gray-400">{song.artist}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600">{song.play_count || 0} plays</p>
                    <p className="text-xs text-gray-400">{new Date(song.created_at).toLocaleDateString('th-TH')}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${song.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {song.is_public ? 'สาธารณะ' : 'ซ่อน'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
