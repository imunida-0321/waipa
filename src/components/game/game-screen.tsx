import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useNavigation } from 'expo-router'
import { haptics } from '@/lib/haptics'
import { maybeShowGameExitInterstitial } from '@/lib/ads'
import { isTrialActive, trialStore } from '@/lib/trial-store'
import type { GameMeta } from '@/games/registry'
import { colors, spacing, typography } from '@/theme/tokens'
import { GameIntroScreen } from './game-intro-screen'
import { HowToPlayModal } from './how-to-play-modal'
import { PlayerSetupSheet } from './player-setup-sheet'
import { TrialLockOverlay } from './trial-lock-overlay'

type Stage = 'intro' | 'setup' | 'play'

// 全ゲーム共通の画面枠: 毎回イントロ（キャッチコピー＋遊び方ダイジェスト）→
// requiresPlayers ならプレイヤー設定ゲート → ヘッダー（戻る/タイトル/？）＋本体
export function GameScreen({ meta }: { meta: GameMeta }) {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation()
	const [stage, setStage] = useState<Stage>('intro')
	const [howToVisible, setHowToVisible] = useState(false)

	useEffect(() => {
		if (stage !== 'play') return
		return navigation.addListener('beforeRemove', () => {
			maybeShowGameExitInterstitial()
		})
	}, [navigation, stage])

	useEffect(() => {
		return () => {
			if (isTrialActive(meta.id)) {
				trialStore.endTrial()
			}
		}
	}, [meta.id])

	const howToModal = (
		<HowToPlayModal
			visible={howToVisible}
			title={`${meta.emoji} ${meta.title}`}
			pages={meta.howToPlay}
			onClose={() => setHowToVisible(false)}
		/>
	)

	if (stage === 'intro') {
		return (
			<>
				<GameIntroScreen
					meta={meta}
					onStart={() => setStage(meta.requiresPlayers ? 'setup' : 'play')}
					onShowHowTo={() => setHowToVisible(true)}
					onClose={() => router.back()}
				/>
				{howToModal}
			</>
		)
	}

	if (stage === 'setup') {
		return (
			<PlayerSetupSheet
				onProceed={() => setStage('play')}
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
				{meta.premium === true ? <TrialLockOverlay gameId={meta.id} /> : null}
			</View>

			{howToModal}
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
	body: { flex: 1, position: 'relative' },
})
