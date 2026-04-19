import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Users, Music, Radio, UserPlus, Calendar, Activity,
  ListMusic, Heart, Play, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';

interface Stats {
  total_users: number;
  total_songs: number;
  total_shares: number;
  online_users: number;
  today_new_users: number;
  today_active_users: number;
  today_new_songs: number;
  today_new_playlists: number;
  total_playlists: number;
  total_likes: number;
  total_plays: number;
}

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: number | string; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [playGrowth, setPlayGrowth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const client = api(token);
        const [statsRes, ugRes, pgRes] = await Promise.all([
          client.get('/stats'),
          client.get('/stats/user-growth?days=14'),
          client.get('/stats/play-growth?days=14'),
        ]);
        setStats(statsRes.data);
        setUserGrowth(ugRes.data);
        setPlayGrowth(pgRes.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">ภาพรวมระบบ MyMood</p>
      </div>

      {/* Row 1: Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Radio} label="ออนไลน์ขณะนี้" value={stats?.online_users || 0} color="bg-green-100 text-green-600" />
        <StatCard icon={UserPlus} label="สมัครใหม่วันนี้" value={stats?.today_new_users || 0} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Calendar} label="แอคทีฟวันนี้ (DAU)" value={stats?.today_active_users || 0} color="bg-orange-100 text-orange-600" />
        <StatCard icon={Users} label="ผู้ใช้ทั้งหมด" value={stats?.total_users || 0} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Row 2: Content Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Music} label="เพลงทั้งหมด" value={stats?.total_songs || 0} color="bg-indigo-100 text-indigo-600" sub={`+${stats?.today_new_songs || 0} วันนี้`} />
        <StatCard icon={ListMusic} label="เพลย์ลิสต์" value={stats?.total_playlists || 0} color="bg-pink-100 text-pink-600" sub={`+${stats?.today_new_playlists || 0} วันนี้`} />
        <StatCard icon={Heart} label="ยอดถูกใจ" value={stats?.total_likes || 0} color="bg-red-100 text-red-600" />
        <StatCard icon={Play} label="ยอดเล่นทั้งหมด" value={stats?.total_plays?.toLocaleString() || '0'} color="bg-teal-100 text-teal-600" />
      </div>

      {/* Row 3: System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">สถานะ API</p>
              <p className="text-lg font-bold text-green-600">Online ✓</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">แชร์เพลง</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.total_shares || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">อัปโหลดใหม่วันนี้</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.today_new_songs || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">📈 การเติบโตของผู้ใช้ (14 วัน)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={userGrowth}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(v) => `วันที่ ${v}`} />
              <Area type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorUsers)" name="ผู้ใช้ใหม่" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Play Count Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">🎵 ยอดเล่นเพลง (14 วัน)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={playGrowth}>
              <defs>
                <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(v) => `วันที่ ${v}`} />
              <Area type="monotone" dataKey="count" stroke="#EC4899" strokeWidth={2} fill="url(#colorPlays)" name="ยอดเล่น" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
