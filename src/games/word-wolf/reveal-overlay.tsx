import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useDrumroll } from '@/components/game/use-drumroll'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, spacing, typography } from '@/theme/tokens'
import { WW } from './theme'

type Props = {
	name: string // 最多票で吊られた人の表示名
	wasWolf: boolean
	onDone: () => void
}

// ドラムロール → 正体ドン！（useDrumroll の流儀）
export function RevealOverlay({ name, wasWolf, onDone }: Props) {
	const { phase, start } = useDrumroll()

	useEffect(() => {
		start()
	}, [start])

	if (phase !== 'revealed') {
		return (
			<View style={styles.container}>
				<Text style={styles.rolling}>🥁 運命の開票…</Text>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<Text style={styles.name}>{name}さんは…</Text>
			<Text style={[styles.identity, { color: wasWolf ? WW.danger : colors.text }]}>
				{wasWolf ? '🐺 ウルフ！' : '😇 市民でした…'}
			</Text>
			<GradientButton title={wasWolf ? '逆転チャンスへ' : '結果発表へ'} onPress={onDone} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	rolling: { ...typography.body, textAlign: 'center', fontSize: 24 },
	name: { ...typography.body, textAlign: 'center' },
	identity: { ...typography.hero, fontSize: 44, textAlign: 'center' },
})
