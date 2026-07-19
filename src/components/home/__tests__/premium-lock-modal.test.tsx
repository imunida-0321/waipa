import { fireEvent, render } from '@testing-library/react-native'
import { router } from 'expo-router'
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
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }))

beforeEach(() => {
	jest.clearAllMocks()
})

it('ゲーム名とプレミアム案内、アップグレード導線を表示する', async () => {
	const { getByText, getByTestId, queryByText } = await render(
		<PremiumLockModal visible gameTitle="バーストチキン" onClose={jest.fn()} />,
	)
	expect(getByTestId('icon-crown')).toBeTruthy()
	expect(queryByText('👑')).toBeNull()
	expect(getByText('バーストチキン')).toBeTruthy()
	expect(getByText(/WaiPa プレミアムで遊べます/)).toBeTruthy()
	expect(queryByText('近日対応予定')).toBeNull()
	expect(getByText('プレミアムにアップグレード')).toBeTruthy()
})

it('アップグレードボタンでモーダルを閉じてペイウォールへ遷移する', async () => {
	const onClose = jest.fn()
	const { getByText } = await render(
		<PremiumLockModal visible gameTitle="バーストチキン" onClose={onClose} />,
	)
	fireEvent.press(getByText('プレミアムにアップグレード'))
	expect(onClose).toHaveBeenCalledTimes(1)
	expect(router.push).toHaveBeenCalledWith('/paywall')
})

it('とじるリンクで onClose が呼ばれる', async () => {
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
	expect(queryByText('プレミアムにアップグレード')).toBeNull()
})
