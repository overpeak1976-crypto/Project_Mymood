import React, { useEffect } from 'react';
import { View, Animated } from 'react-native';

interface SkeletonProps {
  width?: string | number;
  height: number;
  borderRadius?: number;
  className?: string;
}

export function SkeletonLoader({
  width = '100%',
  height,
  borderRadius = 8,
  className = '',
}: SkeletonProps) {
  const shimmer = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={{
        width: typeof width === 'number' ? width : undefined,
        height,
        borderRadius,
        opacity,
      }}
      className={`bg-gray-300 ${className}`}
    />
  );
}

export function SkeletonPlaylist({ count = 5, showThumbnail = true }: { count?: number; showThumbnail?: boolean }) {
  return (
    <View className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="flex-row items-center space-x-3 py-2">
          {showThumbnail && <SkeletonLoader width={50} height={50} borderRadius={8} />}

          <View className="flex-1">
            {/* Song title skeleton */}
            <SkeletonLoader width="80%" height={16} className="mb-2" />

            {/* Artist name skeleton */}
            <SkeletonLoader width="60%" height={12} borderRadius={4} />
          </View>

          {/* Play button skeleton */}
          <SkeletonLoader width={40} height={40} borderRadius={20} />
        </View>
      ))}
    </View>
  );
}

/**
 * SkeletonSongDetail: Full song detail page skeleton
 */
export function SkeletonSongDetail() {
  return (
    <View className="flex-1 bg-gray-50 px-4 py-6">
      {/* Cover image skeleton */}
      <View className="mb-6">
        <SkeletonLoader width="100%" height={300} borderRadius={16} />
      </View>

      {/* Title skeleton */}
      <SkeletonLoader width="85%" height={24} borderRadius={4} className="mb-3" />

      {/* Artist skeleton */}
      <SkeletonLoader width="60%" height={16} borderRadius={4} className="mb-6" />

      {/* Player bar skeleton */}
      <View className="mb-8 space-y-4">
        {/* Timeline skeleton */}
        <SkeletonLoader width="100%" height={4} borderRadius={2} className="mb-2" />

        {/* Time labels skeleton */}
        <View className="flex-row justify-between">
          <SkeletonLoader width="30%" height={12} borderRadius={2} />
          <SkeletonLoader width="30%" height={12} borderRadius={2} />
        </View>
      </View>

      {/* Controls skeleton */}
      <View className="flex-row justify-around mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLoader key={i} width={50} height={50} borderRadius={25} />
        ))}
      </View>

      {/* Stats skeleton */}
      <View className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} className="flex-row justify-between items-center">
            <SkeletonLoader width="40%" height={14} borderRadius={4} />
            <SkeletonLoader width="40%" height={14} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * SkeletonQueueItem: Single queue item placeholder
 */
export function SkeletonQueueItem() {
  return (
    <View className="flex-row items-center space-x-3 py-3">
      {/* Index skeleton */}
      <SkeletonLoader width={30} height={20} borderRadius={4} />

      {/* Thumbnail skeleton */}
      <SkeletonLoader width={40} height={40} borderRadius={4} />

      {/* Text skeleton */}
      <View className="flex-1">
        <SkeletonLoader width="70%" height={14} className="mb-2" />
        <SkeletonLoader width="50%" height={12} borderRadius={2} />
      </View>

      {/* Drag handle skeleton */}
      <SkeletonLoader width={24} height={24} borderRadius={4} />
    </View>
  );
}

/**
 * SkeletonSearchResults: Search results page skeleton
 */
export function SkeletonSearchResults({ count = 8 }: { count?: number }) {
  return (
    <View className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="flex-row items-center space-x-3 p-3 bg-white rounded-lg mb-2">
          <SkeletonLoader width={60} height={60} borderRadius={8} />

          <View className="flex-1">
            <SkeletonLoader width="75%" height={16} className="mb-2" />
            <SkeletonLoader width="55%" height={12} borderRadius={2} />
          </View>

          <SkeletonLoader width={36} height={36} borderRadius={18} />
        </View>
      ))}
    </View>
  );
}

/**
 * SkeletonUserProfile: User profile page skeleton
 */
export function SkeletonUserProfile() {
  return (
    <View className="flex-1 bg-gray-50">
      {/* Header skeleton */}
      <View className="px-4 py-6 bg-white border-b border-gray-200">
        {/* Avatar skeleton */}
        <View className="items-center mb-4">
          <SkeletonLoader width={80} height={80} borderRadius={40} className="mb-3" />
        </View>

        {/* Name skeleton */}
        <SkeletonLoader width="70%" height={20} borderRadius={4} className="mb-2 mx-auto" />

        {/* Handle skeleton */}
        <SkeletonLoader width="50%" height={14} borderRadius={4} className="mb-4 mx-auto" />

        {/* Bio skeleton */}
        <SkeletonLoader width="100%" height={40} borderRadius={4} />
      </View>

      {/* Stats skeleton */}
      <View className="flex-row justify-around px-4 py-4 bg-white border-b border-gray-200">
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} className="items-center">
            <SkeletonLoader width={40} height={20} borderRadius={4} className="mb-2" />
            <SkeletonLoader width={60} height={12} borderRadius={2} />
          </View>
        ))}
      </View>

      {/* Content skeleton */}
      <View className="px-4 py-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} className="mb-4 pb-4 border-b border-gray-200">
            <SkeletonLoader width="80%" height={16} className="mb-2" />
            <SkeletonLoader width="60%" height={12} borderRadius={2} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * SkeletonAIRadioInput: AI Radio prompt input skeleton
 */
export function SkeletonAIRadioInput() {
  return (
    <View className="bg-white rounded-lg p-4">
      {/* Title skeleton */}
      <SkeletonLoader width="60%" height={18} className="mb-3" />

      {/* Input skeleton */}
      <SkeletonLoader width="100%" height={40} borderRadius={8} className="mb-3" />

      {/* Submit button skeleton */}
      <SkeletonLoader width="100%" height={44} borderRadius={8} />
    </View>
  );
}
