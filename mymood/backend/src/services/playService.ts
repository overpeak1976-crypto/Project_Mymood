import { playRepository } from '../repositories/playRepository';

export const playService = {
  async recordPlay(userId: string, songId: string, playedAt?: Date, durationMs?: number, positionMs?: number) {
    console.log(`🎧 User playing song ID: ${songId}`);

    await playRepository.insertPlayHistory(userId, songId, playedAt, durationMs, positionMs);
    await playRepository.updateCurrentPlayingSongId(userId, songId);

    const currentCount = await playRepository.getSongPlayCount(songId);
    const newCount = currentCount + 1;
    await playRepository.updatePlayCount(songId, newCount);

    return { current_views: newCount };
  },

  async getRecentHistory(userId: string) {
    const rows = await playRepository.getRecentHistory(userId, 10);
    return rows.map((r) => r.songs).filter(Boolean);
  },
};
