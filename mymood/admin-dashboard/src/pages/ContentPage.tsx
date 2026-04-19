import React, { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import {
  Search, Music, Trash2, Eye, EyeOff, Play, Pause, Bot, Loader2, X,
} from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  cover_image_url: string | null;
  audio_file_url: string;
  genre: string | null;
  bpm: number | null;
  energy: number | null;
  danceability: number | null;
  music_key: string | null;
  music_scale: string | null;
  play_count: number;
  is_public: boolean;
  created_at: string;
  uploaded_by: string | null;
  uploader?: { handle: string };
}

export default function ContentPage({ token }: { token: string }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'hidden'>('all');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchSongs = async () => {
    try {
      const res = await api(token).get('/songs');
      setSongs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSongs(); }, [token]);

  const filteredSongs = songs.filter((s) => {
    const matchSearch = search === '' ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase()) ||
      (s.uploader?.handle || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ||
      (filter === 'public' && s.is_public) ||
      (filter === 'hidden' && !s.is_public);
    return matchSearch && matchFilter;
  });

  const handleDelete = async (song: Song) => {
    if (!window.confirm(`ลบเพลง "${song.title}" ?`)) return;
    try {
      await api(token).delete(`/songs/${song.id}`);
      setSongs(prev => prev.filter(s => s.id !== song.id));
      if (selectedSong?.id === song.id) setSelectedSong(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'ลบไม่สำเร็จ');
    }
  };

  const handleToggleVisibility = async (song: Song) => {
    try {
      const newPublic = !song.is_public;
      await api(token).patch(`/songs/${song.id}/visibility`, { is_public: newPublic });
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, is_public: newPublic } : s));
      if (selectedSong?.id === song.id) setSelectedSong({ ...selectedSong, is_public: newPublic });
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleReanalyze = async (songId: string) => {
    setAnalyzingId(songId);
    try {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api/admin').replace('/admin', '');
      await api(token).post(`${baseUrl}/songs/${songId}/reanalyze`);
      alert('วิเคราะห์ AI เรียบร้อย!');
      fetchSongs();
    } catch (err: any) {
      alert(err.response?.data?.error || 'วิเคราะห์ไม่สำเร็จ');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handlePlayPause = (song: Song) => {
    if (playingId === song.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(song.audio_file_url);
      audio.play();
      audio.onended = () => setPlayingId(null);
      audioRef.current = audio;
      setPlayingId(song.id);
    }
  };

  // AI data completeness check
  const isComplete = (s: Song) => {
    return s.genre && s.genre !== 'Unknown' && s.bpm && s.music_key && s.energy != null && s.danceability != null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการเนื้อหา</h1>
        <p className="text-gray-500 text-sm mt-1">จัดการเพลง ฟังทดสอบ ซ่อน/แสดง ลบเพลงที่ละเมิด</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาเพลง ศิลปิน หรือ @ผู้อัปโหลด..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">ทั้งหมด ({songs.length})</option>
          <option value="public">สาธารณะ ({songs.filter(s => s.is_public).length})</option>
          <option value="hidden">ซ่อน ({songs.filter(s => !s.is_public).length})</option>
        </select>
      </div>

      <p className="text-sm text-gray-400 mb-3">แสดง {filteredSongs.length} เพลง</p>

      {/* Songs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase w-12"></th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">เพลง</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">อัปโหลดโดย</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">AI</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">สถานะ</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">Plays</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredSongs.map((song) => (
              <tr key={song.id} className="hover:bg-gray-50/50 transition-colors">
                {/* Play button */}
                <td className="p-4">
                  <button
                    onClick={() => handlePlayPause(song)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      playingId === song.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-600'
                    }`}
                  >
                    {playingId === song.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                </td>

                {/* Song info */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                      {song.cover_image_url ? (
                        <img src={song.cover_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="w-5 h-5" /></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate max-w-[200px]">{song.title}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{song.artist}</p>
                    </div>
                  </div>
                </td>

                <td className="p-4 text-sm text-gray-500">@{song.uploader?.handle || 'ไม่ทราบ'}</td>

                {/* AI Status */}
                <td className="p-4 text-center">
                  {isComplete(song) ? (
                    <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">สมบูรณ์</span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-bold">ขาดข้อมูล</span>
                  )}
                </td>

                {/* Visibility */}
                <td className="p-4 text-center">
                  {song.is_public ? (
                    <span className="text-green-600 text-xs font-medium">สาธารณะ</span>
                  ) : (
                    <span className="text-gray-400 text-xs font-medium">ซ่อน</span>
                  )}
                </td>

                <td className="p-4 text-center text-sm text-gray-600">{song.play_count || 0}</td>

                {/* Actions */}
                <td className="p-4">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => handleReanalyze(song.id)}
                      disabled={analyzingId === song.id || isComplete(song)}
                      className={`p-2 rounded-lg transition-colors ${
                        isComplete(song) ? 'text-gray-300 cursor-not-allowed' : 'text-purple-600 hover:bg-purple-50'
                      }`}
                      title="วิเคราะห์ AI"
                    >
                      {analyzingId === song.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setSelectedSong(song)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="ดูรายละเอียด"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(song)}
                      className={`p-2 rounded-lg transition-colors ${song.is_public ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                      title={song.is_public ? 'ซ่อนเพลง' : 'แสดงเพลง'}
                    >
                      {song.is_public ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(song)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="ลบเพลง"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSongs.length === 0 && (
          <div className="p-12 text-center text-gray-400">ไม่พบเพลงที่ตรงกับการค้นหา</div>
        )}
      </div>

      {/* Song Detail Modal */}
      {selectedSong && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setSelectedSong(null); audioRef.current?.pause(); setPlayingId(null); }}>
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">รายละเอียดเพลง</h2>
              <button onClick={() => { setSelectedSong(null); audioRef.current?.pause(); setPlayingId(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-40 h-40 bg-gray-200 rounded-2xl overflow-hidden shadow-lg mb-4">
                {selectedSong.cover_image_url ? (
                  <img src={selectedSong.cover_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="w-12 h-12" /></div>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-800 text-center">{selectedSong.title}</h3>
              <p className="text-gray-500 mb-2">{selectedSong.artist}</p>

              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {selectedSong.genre && (
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">{selectedSong.genre}</span>
                )}
                {selectedSong.bpm && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{Math.round(selectedSong.bpm)} BPM</span>
                )}
                {selectedSong.music_key && (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">{selectedSong.music_key} {selectedSong.music_scale}</span>
                )}
              </div>

              <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100">
                <audio controls src={selectedSong.audio_file_url} className="w-full h-10" />
              </div>

              <div className="flex gap-3 mt-4 w-full">
                <button
                  onClick={() => handleToggleVisibility(selectedSong)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    selectedSong.is_public
                      ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {selectedSong.is_public ? <><EyeOff className="w-4 h-4" /> ซ่อนเพลง</> : <><Eye className="w-4 h-4" /> แสดงเพลง</>}
                </button>
                <button
                  onClick={() => { handleDelete(selectedSong); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> ลบเพลง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
