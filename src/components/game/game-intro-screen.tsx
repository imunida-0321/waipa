import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { haptics } from '@/lib/haptics'
import type { GameMeta } from '@/games/registry'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	meta: GameMeta
	onStart: () => void
	onShowHowTo: () => void
	onClose: () => void
}

// ゲーム開始前に毎回表示するイントロ画面:
// サムネ＋キャッチコピー＋「ゲームスタート」＋遊び方概要＋詳細モーダル導線＋閉じる
export function GameIntroScreen({ meta, onStart, onShowHowTo, onClose }: Props) {
	const insets = useSafeAreaInsets()
	return (
		<View style={styles.screen}>
			<LinearGradient colors={[meta.gradient[0], meta.gradient[1]]} style={styles.glow} />
			<View
				style={[
					styles.content,
					{
						paddingTop: insets.top + spacing.xl,
						paddingBottom: insets.bottom + spacing.lg,
					},
				]}
			>
				<View style={styles.hero}>
					{meta.thumbnail !== undefined ? (
						<Image source={meta.thumbnail} style={styles.thumb} />
					) : (
						<LinearGradient
							colors={[meta.gradient[0], meta.gradient[1]]}
							style={styles.thumbFallback}
						>
							<Text style={styles.thumbEmoji}>{meta.emoji}</Text>
						</LinearGradient>
					)}
					<Text style={styles.catchCopy}>{meta.catchCopy ?? meta.tagline}</Text>
					<Pressable
						accessibilityRole="button"
						onPress={() => {
							haptics.tap()
							onStart()
						}}
						style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
					>
						<Text style={styles.startLabel}>ゲームスタート</Text>
					</Pressable>
				</View>

				<View style={styles.howto}>
					<View style={styles.howtoHeader}>
						<View style={styles.qBadge}>
							<Text style={styles.qMark}>？</Text>
						</View>
						<Text style={styles.howtoTitle}>遊び方</Text>
					</View>
					<Text style={styles.summary}>{meta.summary ?? meta.howToPlay.join('\n')}</Text>
					<Pressable
						accessibilityRole="button"
						onPress={() => {
							haptics.tap()
							onShowHowTo()
						}}
						style={({ pressed }) => [styles.detailBtn, pressed && styles.pressed]}
					>
						<Text style={styles.detailLabel}>詳しい遊び方を見る</Text>
					</Pressable>
				</View>

				<View style={styles.closeWrap}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="とじる"
						onPress={() => {
							haptics.tap()
							onClose()
						}}
						style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
					>
						<Text style={styles.closeIcon}>×</Text>
					</Pressable>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	glow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.22 },
	content: { flex: 1, paddingHorizontal: spacing.lg },
	hero: { alignItems: 'center', gap: spacing.lg },
	thumb: { width: 120, height: 120, borderRadius: 28 },
	thumbFallback: {
		width: 120,
		height: 120,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
	},
	thumbEmoji: { fontSize: 56 },
	catchCopy: { ...typography.title, textAlign: 'center', lineHeight: 32 },
	startBtn: {
		alignSelf: 'stretch',
		backgroundColor: '#FFFFFF',
		borderRadius: radii.md,
		paddingVertical: spacing.md,
		alignItems: 'center',
	},
	startLabel: { fontSize: 18, fontWeight: '700', color: '#1A1730' },
	howto: { marginTop: spacing.xl, gap: spacing.md },
	howtoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
	qBadge: {
		width: 28,
		height: 28,
		borderRadius: 6,
		backgroundColor: '#3B82F6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	qMark: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
	howtoTitle: { ...typography.title },
	summary: { ...typography.body, fontSize: 14, lineHeight: 22 },
	detailBtn: {
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.6)',
		borderRadius: radii.md,
		paddingVertical: spacing.md,
		alignItems: 'center',
	},
	detailLabel: { ...typography.body, fontWeight: '600' },
	closeWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
	closeBtn: {
		width: 64,
		height: 64,
		borderRadius: radii.md,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	closeIcon: { fontSize: 28, fontWeight: '700', color: '#1A1730', lineHeight: 30 },
	pressed: { opacity: 0.75 },
})
