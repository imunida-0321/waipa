import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { HowToPlayModal } from '../how-to-play-modal'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))
jest.mock('@/components/ui/gradient-button', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Pressable, Text } = require('react-native')
	return {
		GradientButton: ({ title, onPress }: { title: string; onPress: () => void }) => (
			<Pressable onPress={onPress}>
				<Text>{title}</Text>
			</Pressable>
		),
	}
})

const pages = ['ページ1の説明', 'ページ2の説明'] as const

it('最初のページが表示される', async () => {
	const { getByText, queryByText } = await render(
		<HowToPlayModal visible title="テストゲーム" pages={pages} onClose={jest.fn()} />,
	)
	expect(getByText('ページ1の説明')).toBeTruthy()
	expect(queryByText('ページ2の説明')).toBeNull()
})

it('「次へ」で2ページ目、最終ページの「閉じる」で onClose', async () => {
	const onClose = jest.fn()
	const { getByText } = await render(
		<HowToPlayModal visible title="テストゲーム" pages={pages} onClose={onClose} />,
	)
	fireEvent.press(getByText('次へ'))
	await waitFor(() => {
		expect(getByText('ページ2の説明')).toBeTruthy()
	})
	fireEvent.press(getByText('閉じる'))
	expect(onClose).toHaveBeenCalledTimes(1)
})
