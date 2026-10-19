import React from 'react';
import { StyleSheet, View } from 'react-native';

export const AVATAR_OPTIONS = [
  { id: 'sprout', name: 'Sprout', skin: '#F2C9A5', hair: '#49352C', outfit: '#4CAF80', accent: '#F0C040' },
  { id: 'ember', name: 'Ember', skin: '#D89A72', hair: '#8E3B2F', outfit: '#D96B45', accent: '#F0C040' },
  { id: 'tide', name: 'Tide', skin: '#F0B88A', hair: '#253A5A', outfit: '#438EB5', accent: '#A8D8B8' },
  { id: 'moss', name: 'Moss', skin: '#A96D50', hair: '#22221F', outfit: '#8B9B4A', accent: '#E6A817' },
] as const;

export type AvatarId = typeof AVATAR_OPTIONS[number]['id'];

const sprite = [
  '..HHH..',
  '.HHHHH.',
  '.HSSSH.',
  '.HESEH.',
  '..SSS..',
  '.CCCCC.',
  'ACCCCA.',
  '.CCCCC.',
  '.C...C.',
];

export function isAvatarId(value: unknown): value is AvatarId {
  return AVATAR_OPTIONS.some(option => option.id === value);
}

export default function PixelAvatar({ avatarId = 'sprout', size = 63 }: { avatarId?: AvatarId; size?: number }) {
  const avatar = AVATAR_OPTIONS.find(option => option.id === avatarId) ?? AVATAR_OPTIONS[0];
  const pixel = size / 7;
  const palette: Record<string, string> = { H: avatar.hair, S: avatar.skin, E: '#0D1224', C: avatar.outfit, A: avatar.accent };
  return <View accessibilityLabel={`${avatar.name} pixel character`} style={{ width: pixel * 7, height: pixel * 9 }}>
    {sprite.map((row, y) => row.split('').map((cell, x) => cell === '.' ? null : <View key={`${y}-${x}`} style={[styles.pixel, { left: x * pixel, top: y * pixel, width: pixel, height: pixel, backgroundColor: palette[cell] }]} />))}
  </View>;
}

const styles = StyleSheet.create({ pixel: { position: 'absolute' } });
