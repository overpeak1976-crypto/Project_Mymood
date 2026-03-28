import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../admin-dashboard/src/config/supabase';

export default function Login({ setAdminToken }: { setAdminToken: (token: string) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่านให้ครบครับ');
      return;
    }

    setLoading(true);
    
    // 1. ล็อกอินผ่าน Supabase
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.session) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้องครับ');
      setLoading(false);
      return;
    }

    // 2. ดึง JWT Token ออกมา
    const token = data.session.access_token;

    // (Optionally) คุณสามารถดึง role จาก user table มาเช็คตรงนี้ได้ด้วยว่าใช่ admin จริงไหม
    // ก่อนจะให้เข้าสู่ระบบ แต่เดี๋ยว API หลังบ้านเราก็ดักไว้แล้ว
    
    // 3. เก็บ Token และพาไปหน้า Dashboard
    setAdminToken(token);
    navigate('/dashboard'); 
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F3FF] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-purple-800">
          Admin Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          ระบบจัดการเบื้องหลัง My Mood
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-purple-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading ? 'bg-purple-300' : 'bg-purple-600 hover:bg-purple-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}