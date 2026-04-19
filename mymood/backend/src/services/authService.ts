import { supabase } from '../config/supabase';

// Auth uses Supabase Auth SDK (not raw DB) — no Prisma needed here.
// The users table sync DOES use Prisma via the userRepository.
export const authService = {
  async googleSync(
    id: string,
    email: string,
    username: string,
    profileImageUrl: string,
  ) {
    const handle = username
      ? username.toLowerCase().replace(/[^a-z0-9]/g, '')
      : email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    const { data, error } = await supabase
      .from('users')
      .upsert({
        id,
        email,
        username,
        handle,
        password_hash: 'google_oauth_managed',
        profile_image_url: profileImageUrl,
        is_online: true,
        last_active: new Date(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async syncUser(id: string, email: string, username: string) {
    const handle = username
      ? username.toLowerCase().replace(/[^a-z0-9]/g, '')
      : email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    const { data, error } = await supabase
      .from('users')
      .upsert({
        id,
        email,
        username,
        handle,
        password_hash: 'supabase_managed',
        is_online: true,
        last_active: new Date(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // Update online status
    await supabase
      .from('users')
      .update({ is_online: true, last_active: new Date() })
      .eq('id', data.user.id);

    return {
      access_token: data.session.access_token,
      user: data.user,
    };
  },
};
