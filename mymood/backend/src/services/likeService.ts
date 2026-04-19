import { likeRepository } from '../repositories/likeRepository';

export const likeService = {
  async toggleLike(userId: string, songId: string) {
    if (!songId) throw new Error('กรุณาส่ง song_id มาด้วยครับ');

    const existingLike = await likeRepository.findLike(userId, songId);

    if (existingLike) {
      await likeRepository.deleteLike(userId, songId);
      return { isLiked: false };
    } else {
      await likeRepository.insertLike(userId, songId);
      return { isLiked: true };
    }
  },

  async getMyLikedSongs(userId: string) {
    return likeRepository.getLikedSongs(userId);
  },
};
