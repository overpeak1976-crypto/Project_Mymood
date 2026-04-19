import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  Search, Users, MessageSquare, Shield, ShieldOff, ShieldAlert,
  Eye, ChevronDown, X, Send, Loader2,
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  handle: string;
  email: string;
  created_at: string;
  last_active: string | null;
  is_online: boolean;
  role: string;
  profile_image_url: string | null;
  bio: string | null;
}

export default function UsersPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [messageModal, setMessageModal] = useState<{ userId: string; userName: string } | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await api(token).get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [token]);

  const filteredUsers = users.filter((u) => {
    const matchSearch = search === '' ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.handle.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!window.confirm(`เปลี่ยนสิทธิ์เป็น "${newRole}"?`)) return;
    setActionLoading(userId);
    try {
      await api(token).patch(`/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendMessage = async () => {
    if (!adminMessage.trim() || !messageModal) return;
    setIsSending(true);
    try {
      await api(token).post(`/users/${messageModal.userId}/message`, {
        title: messageTitle || undefined,
        message: adminMessage,
      });
      alert(`ส่งข้อความหา @${messageModal.userName} สำเร็จ!`);
      setMessageModal(null);
      setAdminMessage('');
      setMessageTitle('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'ส่งไม่สำเร็จ');
    } finally {
      setIsSending(false);
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      user: 'bg-gray-100 text-gray-600',
      banned: 'bg-red-100 text-red-700',
      suspended: 'bg-yellow-100 text-yellow-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colors[role] || colors.user}`}>
        {role}
      </span>
    );
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
        <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้งาน</h1>
        <p className="text-gray-500 text-sm mt-1">ค้นหา ดูข้อมูล และจัดการสิทธิ์ผู้ใช้</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาจาก ID, Username, Email, Handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">ทุกสิทธิ์</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="banned">Banned</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-400 mb-3">แสดง {filteredUsers.length} จาก {users.length} คน</p>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">ผู้ใช้</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">อีเมล</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">สถานะ</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">สิทธิ์</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">สมัครเมื่อ</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                        {user.profile_image_url ? (
                          <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Users className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      {user.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{user.username}</p>
                      <p className="text-xs text-gray-400">@{user.handle}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-600">{user.email}</td>
                <td className="p-4">
                  {user.is_online ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Online
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {user.last_active ? new Date(user.last_active).toLocaleDateString('th-TH') : 'ไม่ทราบ'}
                    </span>
                  )}
                </td>
                <td className="p-4">{roleBadge(user.role || 'user')}</td>
                <td className="p-4 text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('th-TH')}
                </td>
                <td className="p-4">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => navigate(`/users/${user.id}`)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="ดูรายละเอียด"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setMessageModal({ userId: user.id, userName: user.handle })}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="ส่งข้อความ"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    {/* Role dropdown */}
                    {actionLoading === user.id ? (
                      <div className="p-2"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                    ) : (
                      <div className="relative group">
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="เปลี่ยนสิทธิ์">
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 hidden group-hover:block min-w-[140px]">
                          {user.role !== 'admin' && (
                            <button onClick={() => handleRoleChange(user.id, 'admin')} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-purple-600 hover:bg-purple-50">
                              <Shield className="w-4 h-4" /> ให้เป็น Admin
                            </button>
                          )}
                          {user.role !== 'user' && (
                            <button onClick={() => handleRoleChange(user.id, 'user')} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                              <Users className="w-4 h-4" /> ให้เป็น User
                            </button>
                          )}
                          {user.role !== 'suspended' && (
                            <button onClick={() => handleRoleChange(user.id, 'suspended')} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50">
                              <ShieldOff className="w-4 h-4" /> ระงับชั่วคราว
                            </button>
                          )}
                          {user.role !== 'banned' && (
                            <button onClick={() => handleRoleChange(user.id, 'banned')} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                              <ShieldAlert className="w-4 h-4" /> แบน
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-12 text-center text-gray-400">ไม่พบผู้ใช้ที่ตรงกับการค้นหา</div>
        )}
      </div>

      {/* Message Modal */}
      {messageModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setMessageModal(null)}>
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">ส่งข้อความแจ้งเตือน</h2>
              <button onClick={() => setMessageModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              ถึง: <span className="font-bold text-purple-600">@{messageModal.userName}</span>
            </p>

            <input
              type="text"
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              placeholder="หัวข้อ (ไม่จำเป็น)"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
            />
            <textarea
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="พิมพ์ข้อความที่ต้องการแจ้งเตือน..."
              className="w-full h-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 resize-none"
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setMessageModal(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">
                ยกเลิก
              </button>
              <button
                onClick={handleSendMessage}
                disabled={isSending || !adminMessage.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
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
