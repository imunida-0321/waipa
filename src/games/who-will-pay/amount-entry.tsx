import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { WWP } from './theme'

type Props = {
	onConfirm: (amount: number) => void
}

const MAX_DIGITS = 7

export function AmountEntry({ onConfirm }: Props) {
	const [value, setValue] = useState('')

	const handleDigit = (digit: string) => {
		void haptics.tap()
		if (value.length < MAX_DIGITS) {
			setValue(value + digit)
		}
	}

	const handleDelete = () => {
		void haptics.tap()
		setValue(value.slice(0, -1))
	}

	const handleConfirm = () => {
		const amount = Number(value) || 0
		if (amount > 0) {
			void haptics.success()
			onConfirm(amount)
		}
	}

	const displayAmount = value === '' ? '¥0' : `¥${Number(value).toLocaleString('ja-JP')}`

	const keypadButtons = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['0']]

	return (
		<View style={styles.container}>
			<View style={styles.display}>
				<View style={styles.badge}>
					<Text style={styles.badgeText}>JPY</Text>
				</View>
				<Text style={styles.amount}>{displayAmount}</Text>
			</View>

			<View style={styles.keypad}>
				{keypadButtons.map((row, rowIndex) => (
					<View key={rowIndex} style={styles.row}>
						{row.map((digit) => (
							<Pressable
								key={digit}
								onPress={() => handleDigit(digit)}
								style={({ pressed }) => [
									styles.button,
									pressed && styles.buttonPressed,
								]}
								accessibilityRole="button"
								accessibilityLabel={`${digit}を入力`}
							>
								<Text style={styles.buttonText}>{digit}</Text>
							</Pressable>
						))}
					</View>
				))}

				<View style={styles.row}>
					<Pressable
						onPress={handleDelete}
						style={({ pressed }) => [
							styles.button,
							styles.deleteBtn,
							pressed && styles.buttonPressed,
						]}
						accessibilityRole="button"
						accessibilityLabel="削除"
					>
						<Text style={styles.buttonText}>⌫</Text>
					</Pressable>
				</View>
			</View>

			<Pressable
				onPress={handleConfirm}
				style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
				accessibilityRole="button"
				accessibilityLabel="金額確定"
			>
				<Text style={styles.confirmText}>確定</Text>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: WWP.bg,
		padding: spacing.lg,
		justifyContent: 'flex-start',
	},
	display: {
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		padding: spacing.lg,
		marginBottom: spacing.lg,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
	},
	badge: {
		backgroundColor: WWP.rim,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: radii.sm,
		marginBottom: spacing.md,
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.background,
	},
	amount: {
		...typography.hero,
		fontSize: 48,
		color: colors.text,
	},
	keypad: {
		gap: spacing.sm,
		marginBottom: spacing.lg,
	},
	row: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	button: {
		flex: 1,
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		paddingVertical: spacing.lg,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
	},
	buttonPressed: {
		backgroundColor: colors.surfaceBorder,
		opacity: 0.8,
	},
	buttonText: {
		...typography.title,
		color: colors.text,
	},
	deleteBtn: {
		flex: 1,
	},
	confirmBtn: {
		backgroundColor: WWP.go,
		borderRadius: radii.md,
		paddingVertical: spacing.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmBtnPressed: {
		opacity: 0.8,
	},
	confirmText: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.background,
	},
})
