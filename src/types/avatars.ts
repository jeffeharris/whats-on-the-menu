export type AvatarAnimal = 'cat' | 'dog' | 'bear' | 'bunny' | 'penguin' | 'owl' | 'fox' | 'panda' | 'lion' | 'elephant' | 'frog';

export const AVATAR_ANIMALS: { id: AvatarAnimal; label: string }[] = [
  { id: 'cat', label: 'Cat' },
  { id: 'dog', label: 'Dog' },
  { id: 'bear', label: 'Bear' },
  { id: 'bunny', label: 'Bunny' },
  { id: 'penguin', label: 'Penguin' },
  { id: 'owl', label: 'Owl' },
  { id: 'fox', label: 'Fox' },
  { id: 'panda', label: 'Panda' },
  { id: 'lion', label: 'Lion' },
  { id: 'elephant', label: 'Elephant' },
  { id: 'frog', label: 'Frog' },
];

export function getAvatarImagePath(animal: AvatarAnimal): string {
  return `/avatars/${animal}.png`;
}
