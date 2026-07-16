import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { PACKS } from './engine'
import type { StartConfig } from './reducer'
import { KW } from './theme'

type Props = {
	playerCount: number
	onStart: (config: StartConfig) => void
}

const TIMES = [
	{ seconds: 60, label: '1分' },
	{ seconds: 180, label: '3分' },
	{ seconds: 300, label: '5分' },
] as const

// 開始設定: ウルフ数（7人以上のみ）・議論時間・お題パック
export function SetupScreen({ playerCount, onStart }: Props) {
	const [wolfCount, setWolfCount] = useState<1 | 2>(1)
	const [discussSeconds, setDiscussSeconds] = useState<60 | 180 | 300>(180)
	const [pack, setPack] = useState<string>(PACKS[0].id)

	return (
		<ScrollView contentContainerStyle={styles.container}>
			{playerCount >= 7 && (
				<View style={styles.section}>
					<Text style={styles.label}>🐺 ウルフの人数</Text>
					<View style={styles.row}>
						{([1, 2] as const).map((n) => (
							<Chip
								key={n}
								label={`${n}人`}
								active={wolfCount === n}
								onPress={() => setWolfCount(n)}
							/>
						))}
					</View>
				</View>
			)}

			<View style={styles.section}>
				<Text style={styles.label}>⏱️ 議論時間</Text>
				<View style={styles.row}>
					{TIMES.map((t) => (
						<Chip
							key={t.seconds}
							label={t.label}
							active={discussSeconds === t.seconds}
							onPress={() => setDiscussSeconds(t.seconds)}
						/>
					))}
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.label}>📦 お題パック</Text>
				<View style={styles.row}>
					{PACKS.map((p) => (
						<Chip
							key={p.id}
							label={p.label}
							active={pack === p.id}
							onPress={() => setPack(p.id)}
						/>
					))}
				</View>
			</View>

			<GradientButton
				title="はじめる"
				onPress={() => onStart({ wolfCount, discussSeconds, pack })}
			/>
		</ScrollView>
	)
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={[styles.chip, active && styles.chipActive]}
		>
			<Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	section: { gap: spacing.sm },
	label: { ...typography.caption },
	row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
	chip: {
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		borderRadius: radii.md,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
	},
	chipActive: { borderColor: KW.wolf, backgroundColor: KW.night },
	chipText: { ...typography.body },
	chipTextActive: { color: colors.text, fontWeight: '700' },
})
