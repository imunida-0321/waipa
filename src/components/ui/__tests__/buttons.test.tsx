import { fireEvent, render } from '@testing-library/react-native'
import { GradientButton } from '../gradient-button'
import { PillButton } from '../pill-button'

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
	LinearGradient: ({ children }: any) => children,
}))

describe('GradientButton', () => {
	it('タイトルを表示し、タップで onPress が呼ばれる', () => {
		const onPress = jest.fn()
		const { getByText } = render(
			<GradientButton title="アップグレード" onPress={onPress} />,
		)
		fireEvent.press(getByText('アップグレード'))
		expect(onPress).toHaveBeenCalledTimes(1)
	})

	it('disabled のとき onPress が呼ばれない', () => {
		const onPress = jest.fn()
		const { getByText } = render(
			<GradientButton title="実行" onPress={onPress} disabled />,
		)
		fireEvent.press(getByText('実行'))
		expect(onPress).not.toHaveBeenCalled()
	})
})

describe('PillButton', () => {
	it('タイトルを表示し、タップで onPress が呼ばれる', () => {
		const onPress = jest.fn()
		const { getByText } = render(<PillButton title="👑 プレミアム" onPress={onPress} />)
		fireEvent.press(getByText('👑 プレミアム'))
		expect(onPress).toHaveBeenCalledTimes(1)
	})
})
