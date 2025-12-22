import { useCallback, useRef } from 'react';

// Sound URLs (using free sound effects)
const SOUNDS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  wrong: 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3',
  countdown: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  roundEnd: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  gameStart: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  tick: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
};

type SoundType = keyof typeof SOUNDS;

export function useGameSounds() {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  const preloadSounds = useCallback(() => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      if (!audioCache.current.has(key)) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = 0.5;
        audioCache.current.set(key, audio);
      }
    });
  }, []);

  const playSound = useCallback((type: SoundType, volume = 0.5) => {
    try {
      const cachedAudio = audioCache.current.get(type);
      if (cachedAudio) {
        cachedAudio.currentTime = 0;
        cachedAudio.volume = volume;
        cachedAudio.play().catch(() => {});
      } else {
        const audio = new Audio(SOUNDS[type]);
        audio.volume = volume;
        audio.play().catch(() => {});
        audioCache.current.set(type, audio);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, []);

  return { playSound, preloadSounds };
}
