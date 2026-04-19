import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Image, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { httpClient } from '../../../lib/httpClient';
import { UploadCloud, Image as ImageIcon, Music, CheckCircle, BrainCircuit, Database, Layers3, ArrowUpCircle, CloudUpload, LoaderCircle } from 'lucide-react-native';
import { useToast } from '../../../context/ToastContext';
import MiniPlayer from '../../../components/MiniPlayer';
import { useRouter } from 'expo-router';

export default function UploadScreen() {
    const router = useRouter();
    const { showToast } = useToast();
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [loading, setLoading] = useState(false);
    const [uploadStep, setUploadStep] = useState(-1);
    const processingSteps = [
        {
            text: "กำลังส่งไฟล์เข้าเซิร์ฟเวอร์...",
            icon: (color: string) => <ArrowUpCircle color={color} size={24} />
        },
        {
            text: "กำลังอัปโหลดรูปและเสียงขึ้นคลาวด์...",
            icon: (color: string) => <CloudUpload color={color} size={24} />
        },
        {
            text: "AI กำลังฟังและวิเคราะห์แนวเพลง...",
            icon: (color: string) => <BrainCircuit color={color} size={24} />
        },
        {
            text: "กำลังแปลงความหมาย (Vector)...",
            icon: (color: string) => <Layers3 color={color} size={24} />
        },
        {
            text: "กำลังบันทึกข้อมูลลงฐานข้อมูล...",
            icon: (color: string) => <Database color={color} size={24} />
        },
        {
            text: "เสร็จสมบูรณ์!",
            icon: (color: string) => <CheckCircle color={color} size={24} />
        }
    ];
    const [audioFile, setAudioFile] = useState<any>(null);
    const [coverImage, setCoverImage] = useState<any>(null);



    const pickAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp4'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                if (file.size && file.size > 20 * 1024 * 1024) {
                    showToast('File size exceeds 20MB', 'error');
                    return;
                }
                setAudioFile(file);

                if (!title) {
                    const fileNameNoExt = file.name.split('.').slice(0, -1).join('.');
                    setTitle(fileNameNoExt);
                }
            }
        } catch (error) {
            console.error('Error picking audio:', error);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setCoverImage(result.assets[0]);
            }
        } catch (error) {
            console.error('Error picking image:', error);
        }
    };

    //  สร้างฟังก์ชันอัปโหลดแบบ XHR เพื่อให้จับเปอร์เซ็นต์ได้
    const handleUpload = async () => {
        if (!audioFile) {
            showToast('Please select an audio file', 'info');
            return;
        }
        if (!title.trim() || !artist.trim()) {
            showToast('Please enter song title and artist', 'info');
            return;
        }

        try {
            setLoading(true);
            setUploadStep(0);
            const stepInterval = setInterval(() => {
                setUploadStep((prev) => {
                    if (prev < 4) return prev + 1;
                    return 0;
                });
            }, 3000);

            const formData = new FormData();
            formData.append('title', title);
            formData.append('artist', artist);
            formData.append('is_public', isPublic.toString());

            formData.append('audio', {
                uri: audioFile.uri,
                name: audioFile.name,
                type: audioFile.mimeType || 'audio/mpeg',
            } as any);

            if (coverImage) {
                const ext = coverImage.uri.split('.').pop();
                formData.append('cover_image', {
                    uri: coverImage.uri,
                    name: `cover_${Date.now()}.${ext}`,
                    type: `image/${ext}`,
                } as any);
            }

            // Use httpClient.postFormData with extended timeout for large uploads
            await httpClient.postFormData('/api/songs/upload', formData, { timeout: 120000 });

            clearInterval(stepInterval);
            setUploadStep(5);
            setTimeout(() => {
                showToast('Song uploaded successfully!', 'success');
                setAudioFile(null);
                setCoverImage(null);
                setTitle('');
                setArtist('');
                setUploadStep(-1);
                setLoading(false);
                router.push('/(drawer)/(tabs)');
            }, 1000);

        } catch (error: any) {
            console.error('Upload Error:', error);
            showToast(`Error: ${error.message}`, 'error');
            setLoading(false);
            setUploadStep(-1);
        }
    };

    return (
        <View className="flex-1 bg-[#F5F3FF]">
            <ScrollView className="flex-1 px-6 pt-8 pb-24" keyboardShouldPersistTaps="handled">

                {/* ส่วนอัปโหลดไฟล์เสียง */}
                <TouchableOpacity
                    onPress={pickAudio}
                    className="bg-white border-2 border-dashed border-purple-400 rounded-3xl p-5 items-center justify-center mb-6 shadow-sm"
                >
                    {audioFile ? (
                        <View className="items-center">
                            <CheckCircle color="#10B981" size={48} className="mb-3" />
                            <Text className="text-purple-700 font-bold text-lg text-center">{audioFile.name}</Text>
                            <Text className="text-gray-400 text-sm mt-1">
                                {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                            </Text>
                        </View>
                    ) : (
                        <View className="items-center">
                            <Music color="#A855F7" size={48} className="mb-3" />
                            <Text className="text-purple-600 font-bold text-xl mb-1">Tap to upload audio</Text>
                            <Text className="text-purple-400 text-sm">MP3, WAV, FLAC up to 20 MB</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* ข้อมูลพื้นฐาน */}
                <View className="bg-white rounded-[32px] p-6 shadow-md border border-purple-100 mb-8">
                    <Text className="text-2xl font-extrabold text-purple-600 mb-6">Basic Info</Text>

                    <Text className="text-purple-500 font-bold mb-2 ml-1">Label (Title)</Text>
                    <TextInput
                        className="bg-purple-50 p-4 rounded-2xl text-gray-800 mb-5 font-medium"
                        placeholder="e.g. Midnight City"
                        placeholderTextColor="#A78BFA"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Text className="text-purple-500 font-bold mb-2 ml-1">Artist</Text>
                    <TextInput
                        className="bg-purple-50 p-4 rounded-2xl text-gray-800 mb-6 font-medium"
                        placeholder="Artist Name"
                        placeholderTextColor="#A78BFA"
                        value={artist}
                        onChangeText={setArtist}
                    />

                    <View className="flex-row items-center mb-6">
                        <TouchableOpacity
                            onPress={pickImage}
                            className="w-24 h-24 bg-white border-2 border-dashed border-purple-400 rounded-2xl items-center justify-center overflow-hidden mr-4"
                        >
                            {coverImage ? (
                                <Image source={{ uri: coverImage.uri }} className="w-full h-full" />
                            ) : (
                                <View className="items-center">
                                    <UploadCloud color="#A855F7" size={24} className="mb-1" />
                                    <Text className="text-purple-600 font-bold text-xs">Upload</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <View className="flex-1">
                            <Text className="text-purple-600 font-bold text-base">Choose An Image</Text>
                            <Text className="text-purple-400 text-xs mt-1 leading-4">
                                Recommended size 500x500 px.{'\n'}JPG or PNG only.
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between mt-2 pt-4 border-t border-purple-50">
                        <View>
                            <Text className="text-purple-600 font-bold text-lg">Public Track</Text>
                            <Text className="text-purple-400 text-xs">Everyone can see and play this track.</Text>
                        </View>
                        <Switch
                            trackColor={{ false: "#E5E7EB", true: "#C084FC" }}
                            thumbColor={isPublic ? "#9333EA" : "#f4f3f4"}
                            onValueChange={setIsPublic}
                            value={isPublic}
                        />
                    </View>
                </View>

                {loading ? (
                    <View className="bg-white border-2 border-purple-200 rounded-3xl p-6 shadow-sm mb-10 mt-6 mx-6">

                        {/* แสดงสเต็ปปัจจุบันพร้อมไอคอน */}
                        {uploadStep >= 0 && (
                            <View className="flex-row items-center justify-center bg-purple-50 p-4 rounded-2xl border border-purple-100">

                                {/* แสดงไอคอนของสเต็ปปัจจุบันโดยมีสีต่างกันตามสถานะ */}
                                {(() => {
                                    const stepItem = processingSteps[uploadStep];
                                    const isFinished = uploadStep === 5;

                                    // กำหนดสี: ถ้าเสร็จแล้วสีเขียว ถ้ากำลังทำสีม่วง
                                    const iconColor = isFinished ? "#10B981" : "#9333EA";
                                    const textColor = isFinished ? "text-green-700" : "text-purple-900";

                                    return (
                                        <>
                                            {/* ถ้ากำลังทำ ให้โชว์ตัวหมุนๆ เล็กๆ ข้างหน้า */}
                                            {!isFinished && <ActivityIndicator color="#C084FC" size="small" className="mr-3" />}

                                            {/* เรียกใช้ไอคอน */}
                                            <View className="mr-3">
                                                {stepItem.icon(iconColor)}
                                            </View>

                                            {/* ข้อความสถานะ */}
                                            <Text className={`font-bold text-lg flex-1 ${textColor}`}>
                                                {stepItem.text}
                                            </Text>
                                        </>
                                    );
                                })()}
                            </View>
                        )}
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={handleUpload}
                        className="flex-row items-center justify-center py-4 rounded-full shadow-md mb-10 mx-6 bg-white border-2 border-purple-200"
                    >
                        <UploadCloud color="#9333EA" size={24} className="mr-2" />
                        <Text className="text-purple-600 font-extrabold text-xl">Upload Now</Text>
                    </TouchableOpacity>
                )}

            </ScrollView>

            {/* Mini Player */}
            <MiniPlayer />

        </View>
    );
}