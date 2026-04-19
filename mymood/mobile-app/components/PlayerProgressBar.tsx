import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import { useAudioProgress } from '../context/AudioContext';
import { useAudio } from '../context/AudioContext';

/**
 * Optimized Progress Bar Component
 * Subscribes directly to AudioProgressContext so only this component
 * re-renders on position changes — not the entire player screen.
 */
const PlayerProgressBar = React.memo(
  function PlayerProgressBar() {
    const { currentTime, totalDuration } = useAudioProgress();
    const { seekTo } = useAudio();
    const [isSliding, setIsSliding] = useState(false);
    const [sliderValue, setSliderValue] = useState(0);

    // Update slider position when currentTime changes (only if not user-sliding)
    useEffect(() => {
      if (!isSliding && currentTime !== null && currentTime !== undefined) {
        setSliderValue(currentTime);
      }
    }, [currentTime, isSliding]);

    const formatTime = useCallback((milliseconds: number): string => {
      if (!Number.isFinite(milliseconds) || milliseconds < 0) return "0:00";

      const totalSeconds = Math.floor(milliseconds / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;

      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }, []);

    const handleSliderChange = useCallback((value: number) => {
      setIsSliding(true);
      setSliderValue(value);
    }, []);

    const handleSlidingComplete = useCallback(async (value: number) => {
      try {
        await seekTo(value);
      } catch (error) {
        console.error('[PlayerProgressBar] Seek failed:', error);
      } finally {
        setIsSliding(false);
      }
    }, [seekTo]);

    const maxDuration = useMemo(() => {
      return totalDuration && totalDuration > 0 ? totalDuration : 1;
    }, [totalDuration]);

    const remainingTime = useMemo(() => {
      return (totalDuration || 0) - sliderValue;
    }, [sliderValue, totalDuration]);

    return (
      <View className="mb-10 w-full">
        {/* Slider: All values in milliseconds (matching AudioContext) */}
        <Slider
          tabIndex={0}
          style={{ width: '100%', height: 67 }}
          minimumValue={0}
          maximumValue={maxDuration}
          value={sliderValue}
          // Thumb tracks finger perfectly: Updates locally without waiting for background sync
          onValueChange={handleSliderChange}
          minimumTrackTintColor="#FFFFFF"
          maximumTrackTintColor="#FFFFFF40"
          thumbTintColor="#ffffff"
          // Seek after dragging completes: Safe state transition in finally block
          onSlidingComplete={handleSlidingComplete}
        />
        {/* Time displays: Remaining time on right with negative sign */}
        <View className="flex-row justify-between px-4 mt-[-10px]">
          <Text className="text-gray-300 text-xs font-open-sans">
            {formatTime(sliderValue)}
          </Text>
          <Text className="text-gray-300 text-xs font-open-sans">
            -{formatTime(remainingTime)}
          </Text>
        </View>
      </View>
    );
  }
);

export default PlayerProgressBar;
