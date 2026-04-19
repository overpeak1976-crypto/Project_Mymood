import React from 'react';
import { View } from 'react-native';
import { useAudioProgress } from '../context/AudioContext';

const MiniPlayerProgress = React.memo(() => {
    const { progressFraction } = useAudioProgress();

    return (
        <View
            className="absolute top-0 bottom-0 left-0 bg-purple-500/25"
            style={{ width: `${(progressFraction || 0) * 100}%` }}
        />
    );
});

MiniPlayerProgress.displayName = 'MiniPlayerProgress';

export default MiniPlayerProgress;