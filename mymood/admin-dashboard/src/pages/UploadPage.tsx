import React, { useState, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import {
  Upload, Music, Image, X, Loader2, CheckCircle, AlertCircle,
  FileAudio, FileImage,
} from 'lucide-react';

interface UploadResult {
  message: string;
  song: { id: string };
}

export default function UploadPage({ token }: { token: string }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    // Auto-fill title from filename if empty
    if (!title) {
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(name);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent, type: 'audio' | 'cover') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (type === 'audio') {
      setAudioFile(file);
      if (!title) {
        const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(name);
      }
    } else {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, [title]);

  const preventDefault = (e: React.DragEvent) => e.preventDefault();

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setAlbum('');
    setAudioFile(null);
    setCoverFile(null);
    setCoverPreview(null);
    setProgress(0);
    setResult(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!audioFile || !coverFile || !title.trim() || !artist.trim()) {
      return setResult({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ (ชื่อเพลง, ศิลปิน, ไฟล์เพลง, รูปปก)' });
    }

    setUploading(true);
    setResult(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('artist', artist.trim());
      if (album.trim()) formData.append('album', album.trim());
      formData.append('audio', audioFile);
      formData.append('cover_image', coverFile);

      const res = await api(token).post<UploadResult>('/songs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      setResult({ success: true, message: res.data.message });
      // Reset after success
      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.error || 'อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง',
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">อัปโหลดเพลง</h1>
        <p className="text-gray-500 text-sm mt-1">อัปโหลดเพลงเข้าสู่ระบบ พร้อมวิเคราะห์ AI อัตโนมัติ</p>
      </div>

      <div className="max-w-3xl">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          {/* File Upload Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Audio File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ไฟล์เพลง *</label>
              <div
                onDragOver={preventDefault}
                onDrop={(e) => handleDrop(e, 'audio')}
                onClick={() => audioInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  audioFile
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
                }`}
              >
                {audioFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <FileAudio className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-full">{audioFile.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(audioFile.size)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAudioFile(null); if (audioInputRef.current) audioInputRef.current.value = ''; }}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> เปลี่ยนไฟล์
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Music className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">ลากไฟล์มาวาง หรือคลิกเลือก</p>
                    <p className="text-xs text-gray-400">.mp3, .wav, .flac, .m4a</p>
                  </div>
                )}
              </div>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioSelect}
              />
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">รูปปกเพลง *</label>
              <div
                onDragOver={preventDefault}
                onDrop={(e) => handleDrop(e, 'cover')}
                onClick={() => coverInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  coverFile
                    ? 'border-pink-300 bg-pink-50'
                    : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/30'
                }`}
              >
                {coverPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={coverPreview} alt="Cover" className="w-20 h-20 rounded-xl object-cover shadow-md" />
                    <p className="text-sm font-medium text-gray-800 truncate max-w-full">{coverFile?.name}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); if (coverInputRef.current) coverInputRef.current.value = ''; }}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> เปลี่ยนรูป
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Image className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">ลากรูปมาวาง หรือคลิกเลือก</p>
                    <p className="text-xs text-gray-400">.jpg, .png, .webp</p>
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverSelect}
              />
            </div>
          </div>

          {/* Song Details */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อเพลง *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ฝันดีนะ"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ศิลปิน *</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="เช่น MyMood Artist"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">อัลบั้ม (ไม่จำเป็น)</label>
              <input
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                placeholder="เช่น Single หรือชื่ออัลบั้ม"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 font-medium">กำลังอัปโหลด...</span>
                <span className="text-sm text-purple-600 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">อัปโหลดไฟล์ → วิเคราะห์ AI → บันทึกข้อมูล (อาจใช้เวลาสักครู่)</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 border ${
              result.success
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {result.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <p className="text-sm font-medium">{result.message}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-200"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดเพลง'}
            </button>
            <button
              onClick={resetForm}
              disabled={uploading}
              className="px-5 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              ล้างข้อมูล
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-purple-50 rounded-2xl p-5 mt-6 border border-purple-100">
          <h3 className="font-bold text-purple-800 text-sm mb-2">ระบบทำอะไรอัตโนมัติ?</h3>
          <ul className="text-sm text-purple-700 space-y-1.5">
            <li>• อัปโหลดไฟล์เพลงและรูปปกไปยัง Cloudinary</li>
            <li>• วิเคราะห์ AI เพื่อหา Genre, BPM, Key, Energy, Danceability</li>
            <li>• สร้าง Artist / Album ในระบบอัตโนมัติ</li>
            <li>• สร้าง Vector Embedding สำหรับ AI Search</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
