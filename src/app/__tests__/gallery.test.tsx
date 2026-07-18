import { act, fireEvent, render } from '@testing-library/react-native'
import { router } from 'expo-router'
import { settingsStore } from '@/lib/settings-store'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import GalleryScreen from '../gallery'

jest.mock('@/global.css', () => ({}))
jest.mock('expo-router', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text } = require('react-native')
	return {
		Redirect: ({ href }: { href: string }) => <Text>redirect:{href}</Text>,
		router: { push: jest.fn() },
	}
})
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('@/lib/settings-store', () => ({
	settingsStore: {
		setSoundEnabled: jest.fn(),
		setHapticsEnabled: jest.fn(),
	},
	useSettings: jest.fn(() => ({ soundEnabled: true, hapticsEnabled: false })),
}))
jest.mock('@/lib/topics-store', () => ({
	useTopics: jest.fn(() => ({ topics: [{ id: 't1' }, { id: 't2' }], fetchedAt: null })),
}))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('@/lib/sound', () => ({
	playSound: jest.fn(),
}))

describe('GalleryScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('デザイン確認用の主要セクションを表示する', async () => {
		const { getByText } = await render(<GalleryScreen />)

		expect(getByText('ボタン')).toBeTruthy()
		expect(getByText('カード')).toBeTruthy()
		expect(getByText('設定行')).toBeTruthy()
		expect(getByText('ゲームフレーム')).toBeTruthy()
		expect(getByText('お題データ')).toBeTruthy()
		expect(getByText(/読み込み済み: 2件/)).toBeTruthy()
	})

	it('ボタンと設定行の操作を各ハンドラへ渡す', async () => {
		const { getByText, getAllByRole } = await render(<GalleryScreen />)

		await act(async () => {
			fireEvent.press(getByText('アップグレード'))
		})
		await act(async () => {
			fireEvent.press(getByText('👑 プレミアム'))
		})
		await act(async () => {
			fireEvent.press(getByText('レビューを書く'))
		})
		await act(async () => {
			fireEvent(getAllByRole('switch')[0], 'valueChange', false)
		})
		await act(async () => {
			fireEvent(getAllByRole('switch')[1], 'valueChange', true)
		})
		await act(async () => {
			fireEvent.press(getByText('デモ: ゲーム画面を開く（Who will pay）'))
		})

		expect(playSound).toHaveBeenCalledWith('tap')
		expect(haptics.success).toHaveBeenCalledTimes(1)
		expect(haptics.heavy).toHaveBeenCalledTimes(1)
		expect(settingsStore.setSoundEnabled).toHaveBeenCalledWith(false)
		expect(settingsStore.setHapticsEnabled).toHaveBeenCalledWith(true)
		expect(router.push).toHaveBeenCalledWith({
			pathname: '/game/[id]',
			params: { id: 'who-will-pay' },
		})
	})
})
