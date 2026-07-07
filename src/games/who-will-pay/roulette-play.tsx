import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from 'react-native-reanimated'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import type { DigitSlot } from './payment'
import { RouletteWheel } from './roulette-wheel'
import { WWP } from './theme'
import { useDigitRoulette } from './use-digit-roulette'

type Props = {
	amount: number
	playerColors: string[]
	playerNames: string[]
	onFinish: (slots: DigitSlot[]) => void
}

function BlinkingDigit({ char }: { char: string }) {
	const opacity = useSharedValue(1)

	useEffect(() => {
		opacity.value = withRepeat(
			withSequence(withTiming(0.3, { duration: 300 }), withTiming(1, { duration: 300 })),
			-1,
		)
	}, [opacity])

	const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

	return <Animated.Text style={[styles.digit, style]}>{char}</Animated.Text>
}

// 桁ごとのルーレット演出。金額表示（未確定/点滅/確定）＋盤＋GOボタンを持つ表示専用コンポーネント
export function RoulettePlay({ amount, playerColors, playerNames, onFinish }: Props) {
	const { slots, currentIndex, isSpinning, allDone, spin, rotation } = useDigitRoulette(
		amount,
		playerColors.length,
	)

	useEffect(() => {
		if (allDone) onFinish(slots)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [allDone])

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Who will pay?</Text>

			<View style={styles.amountRow}>
				{slots.map((slot) => {
					const isCurrent = slot.index === currentIndex
					const assignedColor =
						slot.playerIndex !== null ? playerColors[slot.playerIndex] : null
					const assignedName =
						slot.playerIndex !== null ? playerNames[slot.playerIndex] : null

					return (
						<View key={slot.index} style={styles.digitColumn}>
							<Text style={styles.nameLabel}>{assignedName ?? ' '}</Text>
							{isCurrent && isSpinning ? (
								<BlinkingDigit char={slot.char} />
							) : (
								<Text
									style={[
										styles.digit,
										assignedColor
											? { color: assignedColor }
											: styles.digitPending,
									]}
								>
									{slot.char}
								</Text>
							)}
						</View>
					)
				})}
			</View>

			<View style={styles.wheelArea}>
				<RouletteWheel playerColors={playerColors} rotation={rotation} size={260} />
			</View>

			<Pressable
				onPress={spin}
				disabled={isSpinning || allDone}
				accessibilityRole="button"
				accessibilityLabel="GO"
				style={({ pressed }) => [
					styles.goButton,
					(isSpinning || allDone) && styles.goButtonDisabled,
					pressed && styles.goButtonPressed,
				]}
			>
				<Text style={styles.goText}>GO!</Text>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: WWP.bg,
		padding: spacing.lg,
		alignItems: 'center',
	},
	title: {
		...typography.title,
		color: colors.text,
		marginBottom: spacing.md,
	},
	amountRow: {
		flexDirection: 'row',
		gap: spacing.xs,
		marginBottom: spacing.lg,
	},
	digitColumn: {
		alignItems: 'center',
		minWidth: 28,
	},
	nameLabel: {
		...typography.caption,
		color: colors.textMuted,
		fontSize: 10,
		height: 14,
	},
	digit: {
		...typography.hero,
		fontSize: 40,
		color: colors.text,
	},
	digitPending: {
		color: colors.textMuted,
	},
	wheelArea: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	goButton: {
		width: 96,
		height: 96,
		borderRadius: radii.pill,
		backgroundColor: WWP.go,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: spacing.xl,
		shadowColor: WWP.go,
		shadowOpacity: 0.8,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 0 },
		elevation: 8,
	},
	goButtonDisabled: {
		opacity: 0.4,
	},
	goButtonPressed: {
		opacity: 0.8,
	},
	goText: {
		fontSize: 22,
		fontWeight: '800',
		color: colors.background,
	},
})
