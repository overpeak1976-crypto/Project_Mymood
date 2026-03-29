import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Music, Share2, Activity, LayoutDashboard, Trash2, Eye, LogOut, UserPlus, Radio, Calendar, Bot, Loader2, MessageSquare, Send } from 'lucide-react';

const API_URL = "http://localhost:8080/api/admin"; // ชี้ไปที่ Backend

export default function Dashboard({ adminToken, onLogout }: { adminToken: string, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [messageModal, setMessageModal] = useState({ isOpen: false, userId: '', userName: '' });
  const [adminMessage, setAdminMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  // 🌟 1. เพิ่ม State สำหรับเก็บ ID เพลงที่กำลังให้ AI วิเคราะห์
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);



  useEffect(() => {
    fetchData();
  }, [activeTab, adminToken]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };

      if (activeTab === 'dashboard') {
        const res = await axios.get(`${API_URL}/stats`, { headers });
        setStats(res.data);
      } else if (activeTab === 'users') {
        const res = await axios.get(`${API_URL}/users`, { headers });
        setUsers(res.data);
      } else if (activeTab === 'songs') {
        const res = await axios.get(`${API_URL}/songs`, { headers });
        setSongs(res.data);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert("เซสชันหมดอายุ หรือคุณไม่มีสิทธิ์ Admin กรุณาล็อกอินใหม่");
        onLogout();
      } else {
        alert("ดึงข้อมูลไม่สำเร็จ เช็คเซิร์ฟเวอร์ด่วน!");
      }
    }
    setLoading(false);
  };

  const handleDeleteSong = async (id: string, title: string) => {
    if (!window.confirm(`แน่ใจนะว่าจะลบเพลง "${title}"?`)) return;
    try {
      await axios.delete(`${API_URL}/songs/${id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      alert('ลบเพลงสำเร็จ!');
      fetchData();
    } catch (err) {
      alert('ลบเพลงไม่สำเร็จ');
    }
  };

  // 🌟 2. เพิ่มฟังก์ชันสั่ง AI วิเคราะห์ข้อมูลใหม่
  const handleReanalyze = async (songId: string) => {
    setAnalyzingId(songId);
    try {
      // หมายเหตุ: ตัด /admin ออก เพื่อให้ยิงไปที่ /api/songs/:id/reanalyze
      const baseUrl = API_URL.replace('/admin', '');
      await axios.post(`${baseUrl}/songs/${songId}/reanalyze`, {}, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      alert("✅ อัปเดตข้อมูล AI และแนวเพลงเรียบร้อยแล้ว!");
      fetchData(); // ดึงข้อมูลเพลงใหม่เพื่อเปลี่ยนป้ายสถานะเป็นสีเขียว
    } catch (err: any) {
      console.error("Reanalyze error:", err);
      alert("❌ เกิดข้อผิดพลาดในการวิเคราะห์ AI: " + (err.response?.data?.error || err.message));
    } finally {
      setAnalyzingId(null);
    }
  };
  const handleSendMessage = async () => {
    if (!adminMessage.trim()) return alert("กรุณาพิมพ์ข้อความก่อนส่งครับ");
    setIsSending(true);
    try {
      await axios.post(`${API_URL}/users/${messageModal.userId}/message`,
        { message: adminMessage },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      alert(`ส่งข้อความหา ${messageModal.userName} สำเร็จ!`);
      setMessageModal({ isOpen: false, userId: '', userName: '' });
      setAdminMessage('');
    } catch (error) {
      alert("ส่งข้อความไม่สำเร็จ");
    } finally {
      setIsSending(false);
    }
  };

  const Sidebar = () => (
    <div className="w-64 bg-[#EBE6FF] border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col justify-between">
      <div>
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <img src="/src/assets/Logo.png" alt="MyMood Logo" className="h-12" />
        </div>
        <div className="p-4 flex flex-col gap-2">
          <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-gray-50 text-purple-600 font-semibold' : 'text-gray-500 hover:bg-[#F5F3FF]'}`}>
            <LayoutDashboard className="w-5 h-5" /> ภาพรวมสถิติ
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-gray-50 text-purple-600 font-semibold' : 'text-gray-500 hover:bg-[#F5F3FF]'}`}>
            <Users className="w-5 h-5" /> บัญชีผู้ใช้
          </button>
          <button onClick={() => setActiveTab('songs')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'songs' ? 'bg-gray-50 text-purple-600 font-semibold' : 'text-gray-500 hover:bg-[#F5F3FF] '}`}>
            <Music className="w-5 h-5" /> จัดการเพลง
          </button>
        </div>
      </div>
      <div className="p-4 border-t border-gray-200">
        <button onClick={onLogout} className="flex items-center gap-3 p-3 rounded-xl transition-all w-full text-red-500 hover:bg-red-50 font-medium">
          <LogOut className="w-5 h-5" /> ออกจากระบบ
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F3FF] flex">
      <Sidebar />
      <div className="ml-64 p-8 w-full max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-purple-600 font-medium animate-pulse">กำลังโหลดข้อมูล...</div>
        ) : (
          <>
            {/* --- หน้า Dashboard ภาพรวม --- */}
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">ภาพรวมระบบ (Overview)</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100 relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><UserPlus /></div>
                      <div>
                        <p className="text-sm text-gray-500">คนสมัครวันนี้</p>
                        <p className="text-3xl font-extrabold text-gray-800">{stats?.today_new_users || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600"><Calendar /></div>
                      <div>
                        <p className="text-sm text-gray-500">ผู้ใช้งานวันนี้ (Active)</p>
                        <p className="text-3xl font-extrabold text-gray-800">{stats?.today_active_users || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-200 bg-green-50/30">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <Radio className="animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm text-green-600 font-semibold">ออนไลน์ขณะนี้</p>
                        <p className="text-3xl font-extrabold text-green-600">{stats?.online_users || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100 relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-500"><Users className="w-5 h-5" /></div>
                      <div><p className="text-sm text-gray-500">ผู้ใช้ทั้งหมด</p><p className="text-3xl font-extrabold text-gray-800">{stats?.total_users || 0}</p></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100 relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-500"><Music className="w-5 h-5" /></div>
                      <div><p className="text-sm text-gray-500">เพลงในระบบ</p><p className="text-3xl font-extrabold text-gray-800">{stats?.total_songs || 0}</p></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100 relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-500"><Activity className="w-5 h-5" /></div>
                      <div><p className="text-sm text-gray-500">สถานะ API</p><p className="text-2xl font-bold text-green-500">Online</p></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- หน้า Users --- */}
            {activeTab === 'users' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">บัญชีผู้ใช้ทั้งหมด</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                      <tr>
                        <th className="p-4 font-medium">โปรไฟล์</th>
                        <th className="p-4 font-medium">ชื่อผู้ใช้ / Handle</th>
                        <th className="p-4 font-medium">อีเมล</th>
                        <th className="p-4 font-medium">วันที่สมัคร</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                              {user.profile_image_url ? <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Users className="w-5 h-5" /></div>}
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-gray-800">{user.username}</p>
                            <p className="text-sm text-gray-400">@{user.handle}</p>
                          </td>
                          <td className="p-4 text-gray-600">{user.email}</td>
                          <td className="p-4 text-gray-500 text-sm">{new Date(user.created_at).toLocaleDateString('th-TH')}</td>
                          <td className="p-4 flex gap-2 justify-end">
                            <button onClick={() => setMessageModal({ isOpen: true, userId: user.id, userName: user.username })}className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"title="ส่งข้อความแจ้งเตือน">
                              <MessageSquare className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- หน้า Songs --- */}
            {activeTab === 'songs' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">คลังเพลงที่อัปโหลด</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                      <tr>
                        <th className="p-4 font-medium">ปกเพลง</th>
                        <th className="p-4 font-medium">ชื่อเพลง / ศิลปิน</th>
                        <th className="p-4 font-medium">คนอัปโหลด</th>
                        {/* 🌟 3. เพิ่มคอลัมน์สถานะ AI */}
                        <th className="p-4 font-medium text-center">สถานะ AI</th>
                        <th className="p-4 font-medium text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {songs.map((song) => {
                        // 🌟 4. เช็คความสมบูรณ์ของข้อมูลเพลง
                        // 🌟 4. เช็คความสมบูรณ์ของข้อมูลเพลง (ต้องมีค่าครบทุกช่องสำคัญ)
                        const requiredKeys = [
                          'title', 'artist', 'cover_image_url', 'audio_file_url',
                          'genre', 'bpm', 'music_key', 'music_scale', 'energy', 'danceability'
                        ];

                        // 🌟 สร้างตัวแปรมาจับผิดว่าคีย์ไหนบ้างที่หายไป หรือเป็นค่าว่าง
                        const missingKeys = requiredKeys.filter(key =>
                          song[key] === null ||
                          song[key] === undefined ||
                          song[key] === ''
                        );

                        // ปรินต์บอกใน F12 (Console) เลยว่าเพลงนี้ขาดอะไร!
                        if (missingKeys.length > 0) {
                          console.log(`❌ เพลง "${song.title}" ขาดข้อมูลช่อง:`, missingKeys.join(', '));
                        }

                        // อัปเดตเงื่อนไข: ถ้าไม่มีคีย์ไหนหายไปเลย และ genre ไม่ใช่ Unknown
                        const isDataComplete = missingKeys.length === 0 && song.genre !== 'Unknown' && song.genre !== 'อื่นๆ';
                        return (
                          <tr key={song.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">
                              <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden shadow-sm">
                                {song.cover_image_url ? <img src={song.cover_image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="w-5 h-5" /></div>}
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="font-semibold text-gray-800">{song.title}</p>
                              <p className="text-sm text-gray-500">{song.artist}</p>
                            </td>
                            <td className="p-4">
                              <p className="text-sm text-gray-600">@{song.uploader?.handle || 'ไม่ทราบ'}</p>
                            </td>

                            {/* 🌟 5. แสดงป้ายสถานะ */}
                            <td className="p-4 text-center">
                              {isDataComplete ? (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                                  สมบูรณ์
                                </span>
                              ) : (
                                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
                                  ขาดข้อมูล
                                </span>
                              )}
                            </td>

                            <td className="p-4 flex gap-2 justify-center items-center h-full">
                              {/* 🌟 6. เพิ่มปุ่ม AI */}
                              <button
                                onClick={() => handleReanalyze(song.id)}
                                disabled={analyzingId === song.id || isDataComplete}
                                className={`p-2 rounded-lg transition-colors ${isDataComplete
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-purple-600 hover:bg-purple-100'
                                  }`}
                                title="วิเคราะห์แนวเพลงด้วย AI"
                              >
                                {analyzingId === song.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                              </button>

                              <button onClick={() => setSelectedSong(song)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="ดูรายละเอียด">
                                <Eye className="w-5 h-5" />
                              </button>
                              <button onClick={() => handleDeleteSong(song.id, song.title)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบเพลงนี้">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal สำหรับดูรายละเอียดและฟังเพลง */}
      {selectedSong && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedSong(null)}>
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md m-4 relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedSong(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
              <span className="text-2xl font-bold leading-none">&times;</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 w-full text-center border-b border-gray-100 pb-4">รายละเอียดเพลง</h2>
            <div className="w-48 h-48 bg-gray-200 rounded-2xl overflow-hidden shadow-lg mb-6 ring-4 ring-gray-50">
              {selectedSong.cover_image_url ? <img src={selectedSong.cover_image_url} alt="Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="w-16 h-16" /></div>}
            </div>
            <div className="w-full text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{selectedSong.title}</h3>
              <p className="text-lg text-gray-500 mb-2">{selectedSong.artist}</p>
              {/* โชว์ Genre ใน Modal ด้วยเลยเผื่อแอดมินอยากเช็ค */}
              <p className="text-sm font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full inline-block mt-2">
                {selectedSong.genre || 'Unknown'}
              </p>
            </div>
            {selectedSong.audio_file_url ? (
              <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100">
                <audio controls src={selectedSong.audio_file_url} className="w-full outline-none h-12" autoPlay />
              </div>
            ) : (
              <div className="w-full text-center text-red-500 py-4 bg-red-50 rounded-xl border border-red-100 font-medium">ไม่พบไฟล์เสียงเชื่อมต่อ</div>
            )}
          </div>
        </div>
      )}
      {/* Modal ส่งข้อความ */}
      {messageModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md m-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">ส่งข้อความแจ้งเตือน</h2>
            <p className="text-sm text-gray-500 mb-4">ถึงผู้ใช้: <span className="font-bold text-purple-600">@{messageModal.userName}</span></p>

            <textarea
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="พิมพ์ข้อความที่ต้องการแจ้งเตือน เช่น คุณทำผิดกฎระเบียบ..."
              className="w-full h-32 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 resize-none"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMessageModal({ isOpen: false, userId: '', userName: '' })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSendMessage}
                disabled={isSending}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-colors ${isSending ? 'bg-purple-300' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSending ? 'กำลังส่ง...' : 'ส่งข้อความ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}