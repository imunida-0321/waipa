import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { GlassSurface } from '@/components/ui/glass-surface'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { KW } from './theme'

type Props = {
	triggerText: string
	onDone: () => void
}

// 配布完了後・議論前に、今ラウンドの公開「乾杯ルール」を全員に発表する
export function TriggerRevealScreen({ triggerText, onDone }: Props) {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>🍻 今回の乾杯ルール</Text>
			<GlassSurface style={styles.card}>
				<Text style={styles.trigger}>{triggerText}</Text>
			</GlassSurface>
			<Text style={styles.hint}>議論中にこのルールが起きたら、みんなで乾杯！</Text>
			<GradientButton title="議論スタート" onPress={onDone} />
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
	title: { ...typography.body, textAlign: 'center', fontWeight: '700', color: KW.wolf },
	card: {
		minHeight: 160,
		padding: spacing.lg,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: KW.wolf,
		alignItems: 'center',
		justifyContent: 'center',
	},
	trigger: { ...typography.hero, fontSize: 28, textAlign: 'center', color: colors.text },
	hint: { ...typography.caption, textAlign: 'center' },
})
