import { useEffect, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { spacing, typography } from '@/theme/tokens'
import { RP } from './theme'

export const LUCKY_MS = 1400

type Props = {
	playerName: string
	onDone: () => void
}

// ラッキーカードめくり時の発動カットイン（罰免除パス付与）
export function LuckyCutIn({ playerName, onDone }: Props) {
	const onDoneRef = useRef(onDone)
	useEffect(() => {
		onDoneRef.current = onDone
	}, [onDone])

	useEffect(() => {
		haptics.success()
		playSound('reveal')
	}, [])

	useEffect(() => {
		const t = setTimeout(() => onDoneRef.current(), LUCKY_MS)
		return () => clearTimeout(t)
	}, [])

	return (
		<View style={styles.backdrop}>
			<Text style={styles.title}>🍀 罰免除パスGET！</Text>
			<Text style={styles.body}>{playerName}さんは罰ルーレットを1回スキップ！</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10,8,24,0.94)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.md,
	},
	title: { ...typography.hero, color: RP.lucky, textAlign: 'center' },
	body: { ...typography.body, textAlign: 'center' },
})
