import prisma from '../config/prisma';

export const userRepository = {
  async searchByHandle(handle: string) {
    return prisma.users.findMany({
      where: { handle: { contains: handle, mode: 'insensitive' } },
      select: { id: true, username: true, handle: true, profile_image_url: true },
      take: 10,
    });
  },

  async addFriendship(userId: string, friendId: string) {
    return prisma.friendships.create({
      data: { user_id: userId, friend_id: friendId, status: 'pending' },
    });
  },

  // Accept: update incoming request, then delete any duplicate outgoing request
  async acceptFriendship(senderId: string, myId: string) {
    const updated = await prisma.friendships.update({
      where: { user_id_friend_id: { user_id: senderId, friend_id: myId } },
      data: { status: 'accepted' },
    });
    // Clean up any reverse pending entry if it exists
    await prisma.friendships.deleteMany({
      where: { user_id: myId, friend_id: senderId, status: 'pending' },
    });
    return updated;
  },

  async getPlayHistory(userId: string) {
    return prisma.play_history.findMany({
      where: { user_id: userId },
      select: { songs: { select: { genre: true } } },
    });
  },

  async profileData(userId: string) {
    return prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, username: true, handle: true, profile_image_url: true, banner_image_url: true, link: true, bio: true, profile_song_id: true, show_activity_status: true, show_uploads: true, songs_users_profile_song_idTosongs: { select: { id: true, title: true, artist: true, cover_image_url: true, audio_file_url: true } } },
    });
  },

  async uploadsData(userId: string, data: { username?: string; handle?: string; bio?: string; link?: string; profile_image_url?: string; banner_image_url?: string, profile_song_id?: string }) {
    return prisma.users.update({
      where: { id: userId },
      data,
    });
  },

  async getPrivacySettings(userId: string) {
    return prisma.users.findUnique({
      where: { id: userId },
      select: { show_activity_status: true, show_uploads: true },
    });
  },

  async updatePrivacySettings(userId: string, data: { show_activity_status?: boolean; show_uploads?: boolean }) {
    return prisma.users.update({
      where: { id: userId },
      data,
      select: { show_activity_status: true, show_uploads: true },
    });
  },

  async getPublicProfile(userId: string) {
    return prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        handle: true,
        profile_image_url: true,
        banner_image_url: true,
        bio: true,
        link: true,
        profile_song_id: true,
        show_activity_status: true,
        show_uploads: true,
        songs_users_profile_song_idTosongs: {
          select: { id: true, title: true, artist: true, cover_image_url: true, audio_file_url: true },
        },
      },
    });
  },

  async getPublicPlaylists(userId: string) {
    return prisma.playlists.findMany({
      where: { user_id: userId, is_public: true },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        cover_image_url: true,
        playlist_tracks: {
          select: { id: true },
        },
      },
    });
  },

  async getFriendCount(userId: string) {
    return prisma.friendships.count({
      where: {
        status: 'accepted',
        OR: [{ user_id: userId }, { friend_id: userId }],
      },
    });
  },

  async getUploadCount(userId: string) {
    return prisma.songs.count({
      where: { uploaded_by: userId },
    });
  },

  async getFriendshipStatus(myId: string, targetId: string) {
    return prisma.friendships.findFirst({
      where: {
        OR: [
          { user_id: myId, friend_id: targetId },
          { user_id: targetId, friend_id: myId },
        ],
      },
      select: { user_id: true, friend_id: true, status: true },
    });
  },
};
