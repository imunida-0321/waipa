import { fireEvent, render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { GradientButton } from '../gradient-button'
import { PillButton } from '../pill-button'
import { SecondaryButton } from '../secondary-button'

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
jest.mock('expo-linear-gradient', () => ({
	LinearGradient: ({ children }: { children: ReactNode }) => children,
}))

describe('GradientButton', () => {
	it('タイトルを表示し、タップで onPress が呼ばれる', async () => {
		const onPress = jest.fn()
		const { getByText } = await render(
			<GradientButton title="アップグレード" onPress={onPress} />,
		)
		fireEvent.press(getByText('アップグレード'))
		expect(onPress).toHaveBeenCalledTimes(1)
	})

	it('disabled のとき onPress が呼ばれない', async () => {
		const onPress = jest.fn()
		const { getByText } = await render(
			<GradientButton title="実行" onPress={onPress} disabled />,
		)
		fireEvent.press(getByText('実行'))
		expect(onPress).not.toHaveBeenCalled()
	})
})

describe('PillButton', () => {
	it('アイコンとタイトルを表示し、タップで onPress が呼ばれる', async () => {
		const onPress = jest.fn()
		const { getByText, getByTestId, queryByText } = await render(
			<PillButton
				title="プレミアム"
				icon={<Text testID="icon-crown">crown</Text>}
				onPress={onPress}
			/>,
		)
		expect(getByTestId('icon-crown')).toBeTruthy()
		expect(queryByText('👑 プレミアム')).toBeNull()
		fireEvent.press(getByText('プレミアム'))
		expect(onPress).toHaveBeenCalledTimes(1)
	})

	it('ガラス面を土台にする', async () => {
		const { getByTestId } = await render(
			<PillButton title="プレミアム" onPress={() => {}} />,
		)
		expect(getByTestId('glass-surface-pseudo')).toBeTruthy()
	})
})

describe('SecondaryButton', () => {
	it('ガラス面を土台にし、タップで onPress が呼ばれる', async () => {
		const onPress = jest.fn()
		const { getByTestId, getByText } = await render(
			<SecondaryButton title="ホームへ" onPress={onPress} />,
		)
		expect(getByTestId('glass-surface-pseudo')).toBeTruthy()
		fireEvent.press(getByText('ホームへ'))
		expect(onPress).toHaveBeenCalledTimes(1)
	})
})
