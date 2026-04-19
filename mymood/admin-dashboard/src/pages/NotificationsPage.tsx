import React, { useState } from 'react';
import { api } from '../lib/api';
import {
  Bell, Megaphone, UserX, Send, Loader2, CheckCircle, AlertCircle,
} from 'lucide-react';

type Tab = 'broadcast' | 'inactive';

export default function NotificationsPage({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('broadcast');

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; total: number } | null>(null);

  // Inactive state
  const [inactiveTitle, setInactiveTitle] = useState('');
  const [inactiveMessage, setInactiveMessage] = useState('');
  const [inactiveDays, setInactiveDays] = useState(7);
  const [inactiveSending, setInactiveSending] = useState(false);
  const [inactiveResult, setInactiveResult] = useState<{ sent: number; total: number } | null>(null);

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return alert('กรุณาพิมพ์ข้อความ');
    if (!window.confirm('ส่งข้อความหาผู้ใช้ทุกคน?')) return;
    setBroadcastSending(true);
    setBroadcastResult(null);
    try {
      const res = await api(token).post('/notifications/broadcast', {
        title: broadcastTitle || undefined,
        message: broadcastMessage,
      });
      setBroadcastResult(res.data);
      setBroadcastMessage('');
      setBroadcastTitle('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'ส่งไม่สำเร็จ');
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleInactive = async () => {
    if (!inactiveMessage.trim()) return alert('กรุณาพิมพ์ข้อความ');
    if (!window.confirm(`ส่งข้อความหาผู้ใช้ที่ไม่ได้เข้ามา ${inactiveDays} วัน?`)) return;
    setInactiveSending(true);
    setInactiveResult(null);
    try {
      const res = await api(token).post('/notifications/inactive', {
        title: inactiveTitle || undefined,
        message: inactiveMessage,
        days_since: inactiveDays,
      });
      setInactiveResult(res.data);
      setInactiveMessage('');
      setInactiveTitle('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'ส่งไม่สำเร็จ');
    } finally {
      setInactiveSending(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ระบบแจ้งเตือน</h1>
        <p className="text-gray-500 text-sm mt-1">ส่งประกาศและแจ้งเตือนไปยังผู้ใช้ในแอป</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-8">
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'broadcast' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
          }`}
        >
          <Megaphone className="w-4 h-4" /> ส่งทุกคน
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'inactive' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
          }`}
        >
          <UserX className="w-4 h-4" /> ผู้ใช้ที่หายไป
        </button>
      </div>

      {/* Broadcast Tab */}
      {activeTab === 'broadcast' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-lg">ประกาศทั่วไป (Global Broadcast)</h2>
                <p className="text-sm text-gray-500">ส่งข้อความหาผู้ใช้ทุกคนในระบบพร้อมกัน</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">หัวข้อ (ไม่จำเป็น)</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="เช่น 📢 ประกาศปิดปรับปรุงระบบ"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ข้อความ *</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="พิมพ์ข้อความที่ต้องการส่ง..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none"
                />
              </div>

              <button
                onClick={handleBroadcast}
                disabled={broadcastSending || !broadcastMessage.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {broadcastSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {broadcastSending ? 'กำลังส่ง...' : 'ส่งประกาศ'}
              </button>

              {broadcastResult && (
                <div className="flex items-center gap-2 p-4 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-700 font-medium">
                    ส่งสำเร็จ {broadcastResult.sent}/{broadcastResult.total} คน
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inactive Users Tab */}
      {activeTab === 'inactive' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <UserX className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-lg">ส่งหาผู้ใช้ที่ไม่เข้าแอป</h2>
                <p className="text-sm text-gray-500">กำหนดจำนวนวันที่ไม่ได้ใช้งาน แล้วส่งข้อความดึงกลับมา</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ไม่เข้าแอปมากี่วัน</label>
                <select
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={3}>3 วัน</option>
                  <option value={7}>7 วัน</option>
                  <option value={14}>14 วัน</option>
                  <option value={30}>30 วัน</option>
                  <option value={60}>60 วัน</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">หัวข้อ (ไม่จำเป็น)</label>
                <input
                  type="text"
                  value={inactiveTitle}
                  onChange={(e) => setInactiveTitle(e.target.value)}
                  placeholder="เช่น 💜 คิดถึงคุณนะ!"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ข้อความ *</label>
                <textarea
                  value={inactiveMessage}
                  onChange={(e) => setInactiveMessage(e.target.value)}
                  placeholder="เช่น มีเพลงใหม่มาเพียบ มาฟังกันเถอะ!"
                  rows={4}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none"
                />
              </div>

              <button
                onClick={handleInactive}
                disabled={inactiveSending || !inactiveMessage.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {inactiveSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {inactiveSending ? 'กำลังส่ง...' : 'ส่งข้อความ'}
              </button>

              {inactiveResult && (
                <div className="flex items-center gap-2 p-4 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-700 font-medium">
                    ส่งสำเร็จ {inactiveResult.sent}/{inactiveResult.total} คน
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
