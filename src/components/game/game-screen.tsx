import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { haptics } from '@/lib/haptics'
import { hasSeenHowTo, markHowToSeen } from '@/lib/first-visit'
import type { GameMeta } from '@/games/registry'
import { colors, spacing, typography } from '@/theme/tokens'
import { HowToPlayModal } from './how-to-play-modal'
import { PlayerSetupSheet } from './player-setup-sheet'

// 全ゲーム共通の画面枠: requiresPlayers なら開始前にプレイヤー設定ゲート→
// ヘッダー（戻る/タイトル/？）＋初回の遊び方自動表示
export function GameScreen({ meta }: { meta: GameMeta }) {
	const insets = useSafeAreaInsets()
	const [howToVisible, setHowToVisible] = useState(false)
	const [setupDone, setSetupDone] = useState(!meta.requiresPlayers)

	useEffect(() => {
		if (!setupDone) return
		hasSeenHowTo(meta.id).then((seen) => {
			if (!seen) setHowToVisible(true)
		})
	}, [meta.id, setupDone])

	const closeHowTo = () => {
		setHowToVisible(false)
		markHowToSeen(meta.id)
	}

	if (!setupDone) {
		return (
			<PlayerSetupSheet
				onProceed={() => setSetupDone(true)}
				minPlayers={meta.minPlayers}
				maxPlayers={meta.maxPlayers}
			/>
		)
	}

	return (
		<View style={[styles.screen, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Pressable
					accessibilityRole="button"
					onPress={() => {
						haptics.tap()
						router.back()
					}}
					style={styles.headerBtn}
				>
					<Text style={styles.headerIcon}>‹</Text>
				</Pressable>
				<Text style={styles.title} numberOfLines={1}>
					{meta.emoji} {meta.title}
				</Text>
				<View style={styles.headerRight}>
					<Pressable
						accessibilityRole="button"
						onPress={() => setHowToVisible(true)}
						style={styles.headerBtn}
					>
						<Text style={styles.headerIcon}>？</Text>
					</Pressable>
				</View>
			</View>

			<View style={styles.body}>
				<meta.Component />
			</View>

			<HowToPlayModal
				visible={howToVisible}
				title={`${meta.emoji} ${meta.title}`}
				pages={meta.howToPlay}
				onClose={closeHowTo}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: spacing.sm,
		height: 56,
	},
	headerBtn: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerIcon: { fontSize: 22, color: colors.text },
	title: { ...typography.title, flex: 1, textAlign: 'center' },
	headerRight: { flexDirection: 'row' },
	body: { flex: 1 },
})
