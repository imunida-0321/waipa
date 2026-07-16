import { StyleSheet, Text, View } from 'react-native'
import { LottieEffect } from '@/components/game/lottie-effect'
import { lottieAssets } from '@/components/game/lottie-assets'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, spacing, typography } from '@/theme/tokens'
import { KW } from './theme'

type Props = {
	onDone: () => void
}

export function KanpaiTimeScreen({ onDone }: Props) {
	return (
		<View style={styles.container}>
			<LottieEffect source={lottieAssets.cheers} loop style={styles.cheers} />
			<View style={styles.content}>
				<Text style={styles.title}>外したので乾杯！</Text>
				<GradientButton title="結果発表へ" onPress={onDone} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
		overflow: 'hidden',
	},
	cheers: {
		position: 'absolute',
		top: -spacing.xl,
		left: -spacing.xl,
		right: -spacing.xl,
		height: '72%',
	},
	content: {
		flex: 1,
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.xl,
	},
	title: { ...typography.hero, fontSize: 36, textAlign: 'center', color: KW.wolf },
})
