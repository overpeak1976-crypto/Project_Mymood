import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export const songRepository = {
  async getAllSongs() {
    return prisma.songs.findMany({
      orderBy: { created_at: 'desc' },
    });
  },

  async findSongById(id: string) {
    return prisma.songs.findUnique({ where: { id } });
  },

  async findArtistByName(name: string) {
    return prisma.artists.findFirst({
      where: { name: { mode: 'insensitive', equals: name } },
      select: { id: true },
    });
  },

  async createArtist(name: string) {
    return prisma.artists.create({
      data: { name },
      select: { id: true },
    });
  },

  async findAlbumByTitleAndArtist(title: string, artistId: string) {
    return prisma.albums.findFirst({
      where: {
        title: { mode: 'insensitive', equals: title },
        artist_id: artistId,
      },
      select: { id: true },
    });
  },

  async createAlbum(title: string, artistId: string, coverImageUrl: string) {
    return prisma.albums.create({
      data: { title, artist_id: artistId, cover_image_url: coverImageUrl },
      select: { id: true },
    });
  },

  async createSong(data: {
    title: string;
    artist: string;
    artist_id: string | null;
    album_id: string | null;
    uploaded_by: string;
    audio_file_url: string;
    cover_image_url: string;
    bpm: number;
    danceability: number;
    music_key: string;
    music_scale: string;
    energy: number;
    duration_seconds: number;
    genre: string;
  }) {
    return prisma.songs.create({ data, select: { id: true } });
  },

  async updateSongGenre(id: string, genre: string) {
    return prisma.songs.update({ where: { id }, data: { genre } });
  },

  async findSongVector(songId: string) {
    return prisma.song_vectors.findUnique({
      where: { song_id: songId },
      select: { song_id: true },
    });
  },

  // embedding column is Unsupported('vector') — must use raw SQL
  async createSongVector(songId: string, moodKeywords: string, embeddingArray: number[]) {
    const embeddingStr = `[${embeddingArray.join(',')}]`;
    await prisma.$executeRaw`
      INSERT INTO song_vectors (song_id, mood_keywords, embedding)
      VALUES (${songId}::uuid, ${moodKeywords}, ${embeddingStr}::vector)
    `;
  },

  async updateSongVector(songId: string, moodKeywords: string, embeddingArray: number[]) {
    const embeddingStr = `[${embeddingArray.join(',')}]`;
    await prisma.$executeRaw`
      UPDATE song_vectors
      SET mood_keywords = ${moodKeywords}, embedding = ${embeddingStr}::vector, updated_at = now()
      WHERE song_id = ${songId}::uuid
    `;
  },

  async searchSongsByVector(embeddingArray: number[], matchThreshold: number, matchCount: number) {
    const embeddingStr = `[${embeddingArray.join(',')}]`;
    // Uses the match_songs Postgres function (RPC) via raw query
    const results = await prisma.$queryRaw<any[]>`
      SELECT * FROM match_songs(
        ${embeddingStr}::vector,
        ${matchThreshold}::float,
        ${matchCount}::int
      )
    `;
    return results;
  },

  async searchSongsByVectorWithExclude(embeddingArray: number[], matchThreshold: number, matchCount: number, excludeIds: string[] = []) {
    try {
      console.log(`🔍 [Repository] Vector search: threshold=${matchThreshold}, limit=${matchCount}, exclude=${excludeIds.length}`);
      
      const embeddingStr = `[${embeddingArray.join(',')}]`;
      const overfetchCount = matchCount + excludeIds.length + 20;

      if (!excludeIds || excludeIds.length === 0) {
        console.log(`📊 Running match_songs RPC (no exclusions)...`);
        const result = await prisma.$queryRaw<any[]>`
          SELECT * FROM match_songs(
            ${embeddingStr}::vector,
            ${matchThreshold}::float,
            ${matchCount}::int
          )
        `;
        console.log(`✅ RPC returned ${result?.length || 0} songs`);
        if (result && result.length > 0) {
          console.log(`   First 3: ${result.slice(0, 3).map(s => s.title).join(", ")}`);
        }
        return result;
      }

      console.log(`📊 Running match_songs RPC with overfetch=${overfetchCount} to exclude ${excludeIds.length} songs...`);
      const fullResult = await prisma.$queryRaw<any[]>`
        SELECT * FROM match_songs(
          ${embeddingStr}::vector,
          ${matchThreshold}::float,
          ${overfetchCount}::int
        )
      `;
      console.log(`   Overfetch got ${fullResult?.length || 0} songs before exclusion`);
      
      if (fullResult && fullResult.length > 0) {
        const duplicateCount = fullResult.filter(s => excludeIds.includes(s.id)).length;
        console.log(`   Found ${duplicateCount} duplicates to exclude`);
      }
      
      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM (
          SELECT * FROM match_songs(
            ${embeddingStr}::vector,
            ${matchThreshold}::float,
            ${overfetchCount}::int
          )
        ) AS matches
        WHERE id NOT IN (${Prisma.join(excludeIds)})
        LIMIT ${matchCount}::int
      `;
      console.log(`✅ After exclusion, returned ${result?.length || 0} songs`);
      if (result && result.length > 0) {
        console.log(`   First 3: ${result.slice(0, 3).map(s => s.title).join(", ")}`);
      }
      return result;
    } catch (error: any) {
      console.error(`❌ [Repository] Vector search error:`, error.message);
      console.error(`Stack:`, error.stack);
      throw error;
    }
  },

  async getAllSongsCount() {
    const count = await prisma.songs.count();
    console.log(`📊 Total songs in database: ${count}`);
    return count;
  },

  async findMyUploads(userId: string) {
    return prisma.songs.findMany({
      where: { uploaded_by: userId },
      orderBy: { created_at: 'desc' },
    });
  },

  async findFriendsUploads(userId: string) {
    const friendships = await prisma.friendships.findMany({
      where: {
        status: 'accepted',
        OR: [{ user_id: userId }, { friend_id: userId }],
      },
      select: { user_id: true, friend_id: true },
    });

    const friendIds = friendships.map((f) =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    if (friendIds.length === 0) return [];

    return prisma.songs.findMany({
      where: { uploaded_by: { in: friendIds } },
      orderBy: { created_at: 'desc' },
    });
  },

  async findMyTopSongs(userId: string) {
    const topPlays = await prisma.play_history.groupBy({
      by: ['song_id'],
      where: { user_id: userId },
      _count: { song_id: true },
      orderBy: { _count: { song_id: 'desc' } },
      take: 10,
    });

    if (topPlays.length === 0) return [];

    const songIds = topPlays.map((p) => p.song_id).filter((id): id is string => id !== null);

    const songs = await prisma.songs.findMany({
      where: { id: { in: songIds } },
    });

    // Map output safely maintaining descending play history order natively
    return songIds.map((id) => songs.find((s) => s.id === id)).filter(Boolean);
  },
};
