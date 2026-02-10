import { useRef, useCallback } from 'react';

const PLACED_SRC = '/sounds/placed.mp3';
const REJECTED_SRC = '/sounds/rejected.mp3';

export function useSound() {
  const placedRef = useRef<HTMLAudioElement | null>(null);
  const rejectedRef = useRef<HTMLAudioElement | null>(null);

  if (!placedRef.current) {
    placedRef.current = new Audio(PLACED_SRC);
  }
  if (!rejectedRef.current) {
    rejectedRef.current = new Audio(REJECTED_SRC);
  }

  const playPlaced = useCallback(() => {
    const audio = placedRef.current!;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  const playRejected = useCallback(() => {
    const audio = rejectedRef.current!;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  return { playPlaced, playRejected };
}
