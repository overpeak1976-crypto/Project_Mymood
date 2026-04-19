import { userRepository } from '../repositories/userRepository';

export const userService = {
  async searchByHandle(handle: string) {
    return userRepository.searchByHandle(handle);
  },

  async addFriend(myId: string, targetUserId: string) {
    if (myId === targetUserId) {
      throw new Error('แอดตัวเองเป็นเพื่อนไม่ได้นะครับ');
    }
    try {
      return await userRepository.addFriendship(myId, targetUserId);
    } catch (err: any) {
      // Prisma unique constraint violation code
      if (err?.code === 'P2002') {
        throw new Error('ส่งคำขอไปแล้ว หรือเป็นเพื่อนกันอยู่แล้ว');
      }
      throw err;
    }
  },

  async acceptFriend(myId: string, senderId: string) {
    return userRepository.acceptFriendship(senderId, myId);
  },

  async getMyTopGenres(myId: string) {
    const history = await userRepository.getPlayHistory(myId);

    const genreCounts: { [key: string]: number } = {};
    history.forEach((item: any) => {
      const g = item.songs?.genre || 'Unknown';
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });

    const sortedGenres = Object.entries(genreCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return sortedGenres;
  },

  async profileData(userId: string) {
    const user = await userRepository.profileData(userId);
    if (!user) return null;
    const { songs_users_profile_song_idTosongs, ...rest } = user;
    return { ...rest, song: songs_users_profile_song_idTosongs || null };
  },

  async uploadsData(userId: string, data: { username?: string; handle?: string; bio?: string; link?: string; profile_image_url?: string; banner_image_url?: string, profile_song_id?: string }) {
    return userRepository.uploadsData(userId, data);
  },

  async getPrivacySettings(userId: string) {
    return userRepository.getPrivacySettings(userId);
  },

  async updatePrivacySettings(userId: string, data: { show_activity_status?: boolean; show_uploads?: boolean }) {
    return userRepository.updatePrivacySettings(userId, data);
  },

  async getPublicProfile(userId: string, myId?: string) {
    const [user, playlists, friendCount, uploadCount] = await Promise.all([
      userRepository.getPublicProfile(userId),
      userRepository.getPublicPlaylists(userId),
      userRepository.getFriendCount(userId),
      userRepository.getUploadCount(userId),
    ]);
    if (!user) return null;
    const song = user.songs_users_profile_song_idTosongs || null;

    let friendship_status: string = 'none';
    if (myId && myId !== userId) {
      const friendship = await userRepository.getFriendshipStatus(myId, userId);
      if (friendship) {
        if (friendship.status === 'accepted') friendship_status = 'friends';
        else if (friendship.user_id === myId) friendship_status = 'pending_sent';
        else friendship_status = 'pending_received';
      }
    } else if (myId === userId) {
      friendship_status = 'self';
    }

    return {
      id: user.id,
      username: user.username,
      handle: user.handle,
      profile_image_url: user.profile_image_url,
      banner_image_url: user.banner_image_url,
      bio: user.bio,
      link: user.link,
      profile_song_id: user.profile_song_id,
      show_uploads: user.show_uploads,
      song: user.profile_song_id ? song : null,
      playlists: playlists.map(p => ({ ...p, track_count: p.playlist_tracks.length })),
      friend_count: friendCount,
      upload_count: uploadCount,
      friendship_status,
    };
  },
};
