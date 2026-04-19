import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  BarChart3, Music, Heart, TrendingUp, Play,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface Analytics {
  top_songs_by_plays: Array<{ id: string; title: string; artist: string; cover_image_url: string | null; play_count: number; genre: string | null }>;
  top_songs_by_likes: Array<{ id?: string; title?: string; artist?: string; cover_image_url?: string | null; genre?: string | null; like_count: number }>;
  genre_distribution: Array<{ genre: string; count: number }>;
  plays_by_day: Array<{ day: string; count: number }>;
  new_users_by_day: Array<{ day: string; count: number }>;
  uploads_by_day: Array<{ day: string; count: number }>;
}

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#A855F7'];

export default function AnalyticsPage({ token }: { token: string }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api(token).get(`/analytics?days=${days}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token, days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full" />
      </div>
    );
  }

  if (!data) return <div className="text-center py-20 text-gray-400">ไม่สามารถโหลดข้อมูลได้</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">สถิติเชิงลึก</h1>
          <p className="text-gray-500 text-sm mt-1">วิเคราะห์ข้อมูลการใช้งานแอป</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value={7}>7 วัน</option>
          <option value={14}>14 วัน</option>
          <option value={30}>30 วัน</option>
          <option value={60}>60 วัน</option>
          <option value={90}>90 วัน</option>
        </select>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Plays by Day */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-pink-500" /> ยอดเล่นเพลงรายวัน
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.plays_by_day}>
              <defs>
                <linearGradient id="gPlays" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(v) => `วันที่ ${v}`} />
              <Area type="monotone" dataKey="count" stroke="#EC4899" strokeWidth={2} fill="url(#gPlays)" name="ยอดเล่น" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* New Users by Day */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" /> ผู้ใช้ใหม่รายวัน
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.new_users_by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(v) => `วันที่ ${v}`} />
              <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="สมัครใหม่" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Uploads by Day */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Music className="w-5 h-5 text-blue-500" /> อัปโหลดเพลงรายวัน
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.uploads_by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(v) => `วันที่ ${v}`} />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="อัปโหลด" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Genre Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" /> แนวเพลงยอดนิยม
          </h3>
          {data.genre_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.genre_distribution.slice(0, 10)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="genre"
                  label={({ genre, percent }) => `${genre} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.genre_distribution.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-gray-400">ไม่มีข้อมูล</div>
          )}
        </div>
      </div>

      {/* Top Songs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top by Plays */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Play className="w-5 h-5 text-green-500" /> เพลงยอดเล่นสูงสุด
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.top_songs_by_plays.slice(0, 10).map((song, i) => (
              <div key={song.id} className="flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                <span className="text-sm font-bold text-gray-400 w-6 text-center">{i + 1}</span>
                <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  {song.cover_image_url ? (
                    <img src={song.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="w-4 h-4" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{song.title}</p>
                  <p className="text-xs text-gray-400">{song.artist}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-700">{(song.play_count || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">plays</p>
                </div>
              </div>
            ))}
            {data.top_songs_by_plays.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">ไม่มีข้อมูล</div>
            )}
          </div>
        </div>

        {/* Top by Likes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" /> เพลงยอดถูกใจสูงสุด
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.top_songs_by_likes.slice(0, 10).map((song, i) => (
              <div key={song.id || i} className="flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                <span className="text-sm font-bold text-gray-400 w-6 text-center">{i + 1}</span>
                <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  {song.cover_image_url ? (
                    <img src={song.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="w-4 h-4" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{song.title || 'ไม่ทราบ'}</p>
                  <p className="text-xs text-gray-400">{song.artist}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-500">{song.like_count}</p>
                  <p className="text-xs text-gray-400">likes</p>
                </div>
              </div>
            ))}
            {data.top_songs_by_likes.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">ไม่มีข้อมูล</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
