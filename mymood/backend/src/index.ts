import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import songRoutes from './routes/songRoutes';
import aiRoutes from './routes/aiRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import inboxRoutes from './routes/inboxRoutes';
import adminRoutes from './routes/adminRoutes';


dotenv.config();

const app = express();

const port = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json()); // รับข้อมูลแบบ JSON

// Routes
app.use('/api/songs', songRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('My Mood API is running! 🚀');
});

// ตรงส่วน Routes เพิ่มบรรทัดนี้ลงไปใต้ app.use('/api/songs', songRoutes);
app.use('/api/ai', aiRoutes);

// ตรงส่วน Routes เพิ่มบรรทัดนี้ลงไป (ต่อจาก aiRoutes ก็ได้ครับ)
app.use('/api/auth', authRoutes);

app.use('/api/users', userRoutes);

app.use('/api/inbox', inboxRoutes);

app.use('/api/admin', adminRoutes);
// เริ่ม Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});