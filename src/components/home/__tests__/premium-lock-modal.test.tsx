import { fireEvent, render } from '@testing-library/react-native'
import { PremiumLockModal } from '../premium-lock-modal'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('ゲーム名とプレミアム案内、近日対応バッジを表示する', async () => {
	const { getByText } = await render(
		<PremiumLockModal visible gameTitle="バーストチキン" onClose={jest.fn()} />,
	)
	expect(getByText('バーストチキン')).toBeTruthy()
	expect(getByText(/WaiPa プレミアムで遊べます/)).toBeTruthy()
	expect(getByText('近日対応予定')).toBeTruthy()
})

it('とじるで onClose が呼ばれる', async () => {
	const onClose = jest.fn()
	const { getByText } = await render(
		<PremiumLockModal visible gameTitle="バーストチキン" onClose={onClose} />,
	)
	fireEvent.press(getByText('とじる'))
	expect(onClose).toHaveBeenCalled()
})

it('visible=false では何も表示しない', async () => {
	const { queryByText } = await render(
		<PremiumLockModal visible={false} gameTitle="バーストチキン" onClose={jest.fn()} />,
	)
	expect(queryByText('近日対応予定')).toBeNull()
})
