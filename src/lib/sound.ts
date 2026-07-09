import { createAudioPlayer, type AudioPlayer } from 'expo-audio'
import { settingsStore } from './settings-store'

const players = new Map<string, AudioPlayer>()

// 起動時に app/_layout.tsx から registerSound('tap', require('@/assets/sounds/tap.m4a')) の形で登録する
export function registerSound(name: string, source: number) {
	if (players.has(name)) return
	players.set(name, createAudioPlayer(source))
}

export function playSound(name: string) {
	if (!settingsStore.getState().soundEnabled) return
	const player = players.get(name)
	if (!player) return // 未登録音源は無音でスキップ（クラッシュさせない）
	player.seekTo(0)
	player.play()
}
