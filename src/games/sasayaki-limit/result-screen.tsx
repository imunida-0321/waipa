import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ROUNDS } from './engine'
import { SL } from './theme'

type Props = {
	names: string[]
	successCounts: number[]
	losers: number[]
	onRetry: () => void
}

export function ResultScreen({ names, successCounts, losers, onRetry }: Props) {
	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.heading}>結果発表</Text>
			<Text style={styles.loserLabel}>🍻 負けはこの人！</Text>
			{losers.map((i) => (
				<Text key={i} style={styles.loserName} testID="loser-name">
					{names[i]}
				</Text>
			))}
			<View style={styles.list}>
				{names.map((name, i) => (
					<View key={i} style={[styles.row, losers.includes(i) && styles.rowLoser]}>
						<Text style={styles.name}>{name}</Text>
						<Text style={styles.count}>{`${successCounts[i]} / ${ROUNDS} 成功`}</Text>
					</View>
				))}
			</View>
			<Pressable style={styles.retryButton} onPress={onRetry}>
				<Text style={styles.retryLabel}>もう一回あそぶ</Text>
			</Pressable>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: { alignItems: 'center', gap: 12, padding: 24, paddingTop: 48 },
	heading: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
	loserLabel: { color: SL.sub, fontSize: 14, marginTop: 8 },
	loserName: { color: SL.red, fontSize: 32, fontWeight: '900' },
	list: { alignSelf: 'stretch', gap: 8, marginTop: 16 },
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		backgroundColor: SL.track,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderWidth: 1,
		borderColor: SL.trackBorder,
	},
	rowLoser: { borderColor: SL.red },
	name: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
	count: { color: SL.sub, fontSize: 14 },
	retryButton: {
		marginTop: 24,
		paddingHorizontal: 40,
		paddingVertical: 14,
		borderRadius: 999,
		backgroundColor: SL.green,
	},
	retryLabel: { color: '#0B2818', fontSize: 16, fontWeight: '800' },
})
