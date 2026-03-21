import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, Music, Share2, Activity, LayoutDashboard, 
  Trash2, Eye
} from 'lucide-react';

// ใส่ Token แอดมินตรงนี้
const ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ2ZWE5MTYxLTZjYTAtNGMwZC04OWNlLWE3OGVhMDI2Y2YyMyIsImhhbmRsZSI6Im51Z3VuMjEwNSIsImlhdCI6MTc3MzM1MzYyMCwiZXhwIjoxNzczOTU4NDIwfQ.gqnV2geRmvMsnBJ8aC-7Xhn9oPI47CqYvX7M8zqCOB8";
const API_URL = "http://localhost:8080/api/admin";

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<any>(null);

  // ดึงข้อมูลเมื่อโหลดหน้าจอ หรือเปลี่ยน Tab
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${ADMIN_TOKEN}` };
      
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
    } catch (err) {
      console.error("Fetch error:", err);
      alert("ดึงข้อมูลไม่สำเร็จ เช็ค Token ด่วน!");
    }
    setLoading(false);
  };

  const handleDeleteSong = async (id: string, title: string) => {
    if (!window.confirm(`แน่ใจนะว่าจะลบเพลง "${title}"?`)) return;
    try {
      await axios.delete(`${API_URL}/songs/${id}`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      alert('ลบเพลงสำเร็จ!');
      fetchData(); // โหลดข้อมูลใหม่
    } catch (err) {
      alert('ลบเพลงไม่สำเร็จ');
    }
  };

  // --- ส่วนเมนูด้านซ้าย (Sidebar) ---
  const Sidebar = () => (
    <div className="w-64 bg-[#EBE6FF] border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-gray-100">
        <img src="../src/assets/Logo.png" alt="MyMood Logo" className=" h-12"/>
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
  );

  return (
    <div className="min-h-screen bg-[#F5F3FF] flex">
      <Sidebar />
      
      {/* พื้นที่เนื้อหาด้านขวา */}
      <div className="ml-64 p-8 w-full max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">กำลังโหลดข้อมูล...</div>
        ) : (
          <>
            {/* ---------------- หน้าภาพรวม ---------------- */}
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">ภาพรวมระบบ (Overview)</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  {/* Card สถิติเดิม + สถิติจำลอง */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Users /></div>
                      <div><p className="text-sm text-gray-500">ผู้ใช้ทั้งหมด</p><p className="text-2xl font-bold">{stats?.total_users}</p></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600"><Share2 /></div>
                      <div><p className="text-sm text-gray-500">แชร์ทั้งหมด</p><p className="text-2xl font-bold">{stats?.total_shares || 0}</p></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600"><Music /></div>
                      <div><p className="text-sm text-gray-500">เพลงในระบบ</p><p className="text-2xl font-bold">{stats?.total_songs}</p></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600"><Activity /></div>
                      <div><p className="text-sm text-gray-500">สถานะระบบ</p><p className="text-2xl font-bold text-green-500">ปกติ</p></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- หน้าจัดการผู้ใช้ ---------------- */}
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
                              {user.profile_image_url ? <img src={user.profile_image_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Users className="w-5 h-5"/></div>}
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-gray-800">{user.username}</p>
                            <p className="text-sm text-gray-400">@{user.handle}</p>
                          </td>
                          <td className="p-4 text-gray-600">{user.email}</td>
                          <td className="p-4 text-gray-500 text-sm">{new Date(user.created_at).toLocaleDateString('th-TH')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ---------------- หน้าจัดการเพลง ---------------- */}
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
                        <th className="p-4 font-medium text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {songs.map((song) => (
                        <tr key={song.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden shadow-sm">
                              {song.cover_image_url ? <img src={song.cover_image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="w-5 h-5"/></div>}
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-gray-800">{song.title}</p>
                            <p className="text-sm text-gray-500">{song.artist}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-600">@{song.uploader?.handle || 'ไม่ทราบ'}</p>
                          </td>
                          <td className="p-4 flex gap-2 justify-center">
                            <button onClick={() => setSelectedSong(song)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="ดูรายละเอียด">
                              <Eye className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDeleteSong(song.id, song.title)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบเพลงนี้">
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
          </>
        )}
      </div>

      {/* Modal สำหรับดูรายละเอียดและฟังเพลง */}
      {selectedSong && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" onClick={() => setSelectedSong(null)}>
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md m-4 relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedSong(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Trash2 className="w-5 h-5 opacity-0" />
              <span className="text-2xl font-bold absolute top-0 right-0 leading-none">&times;</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 w-full text-center border-b border-gray-100 pb-4">รายละเอียดเพลง</h2>
            
            <div className="w-48 h-48 bg-gray-200 rounded-2xl overflow-hidden shadow-lg mb-6 ring-4 ring-gray-50">
              {selectedSong.cover_image_url ? (
                <img src={selectedSong.cover_image_url} alt="Cover" className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Music className="w-16 h-16"/>
                </div>
              )}
            </div>
            
            <div className="w-full text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-1 line-clamp-2">{selectedSong.title}</h3>
              <p className="text-lg text-gray-500 mb-2">{selectedSong.artist}</p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-sm font-medium rounded-full">
                <Users className="w-4 h-4"/>
                @{selectedSong.uploader?.handle || 'ไม่ทราบ'}
              </span>
            </div>

            {selectedSong.audio_file_url ? (
              <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100">
                 <audio 
                   controls 
                   src={selectedSong.audio_file_url} 
                   className="w-full outline-none h-12"
                   autoPlay
                 />
              </div>
            ) : (
              <div className="w-full text-center text-red-500 py-4 bg-red-50 rounded-xl border border-red-100 font-medium">ไม่พบไฟล์เสียงเชื่อมต่อ</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}