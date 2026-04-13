import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import songRoutes from './routes/songRoutes';
import aiRoutes from './routes/aiRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import inboxRoutes from './routes/inboxRoutes';
import adminRoutes from './routes/adminRoutes';
import uploadRoutes from './routes/uploadRoutes';
import likeRoutes from './routes/likeRoutes';
import playRoutes from './routes/playRoutes';
import friendRoutes from './routes/friendRoutes';
import notificationRoutes from './routes/notificationRoutes';
import playlistRoutes from './routes/playlistRoutes';
import searchRoutes from './routes/searchRoutes';
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json()); // รับข้อมูลแบบ JSON

app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/play', playRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/search', searchRoutes);

app.get('/', (req, res) => {
  res.send('My Mood API is running! 🚀 (Serverless/Realtime Mode)');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});