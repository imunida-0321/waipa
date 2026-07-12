import AsyncStorage from '@react-native-async-storage/async-storage'
import { fireEvent, render } from '@testing-library/react-native'
import { Alert } from 'react-native'
import { settingsStore } from '@/lib/settings-store'
import { contactSupport, writeReview } from '@/lib/support'
import SettingsScreen from '../settings'

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
jest.mock('@/lib/support', () => ({
	contactSupport: jest.fn(async () => {}),
	writeReview: jest.fn(async () => {}),
}))

beforeEach(async () => {
	jest.clearAllMocks()
	await AsyncStorage.clear()
	await settingsStore.hydrate()
})

describe('設定セクション', () => {
	it('効果音とバイブレーションのトグルが表示される', async () => {
		const { getByText } = await render(<SettingsScreen />)
		expect(getByText('効果音')).toBeTruthy()
		expect(getByText('バイブレーション')).toBeTruthy()
	})

	it('トグル操作でストアが更新される', async () => {
		const { getAllByRole } = await render(<SettingsScreen />)
		fireEvent(getAllByRole('switch')[0], 'valueChange', false)
		expect(settingsStore.getState().soundEnabled).toBe(false)
	})

	it('言語行が表示される（MVPは日本語のみ）', async () => {
		const { getByText } = await render(<SettingsScreen />)
		expect(getByText('言語')).toBeTruthy()
		expect(getByText('日本語')).toBeTruthy()
	})
})

describe('プレミアム誘導カード', () => {
	it('キャッチコピーとアップグレードボタンが表示される', async () => {
		const { getByText } = await render(<SettingsScreen />)
		expect(getByText('広告なしで、もっと快適に遊ぼう！')).toBeTruthy()
		expect(getByText('アップグレード')).toBeTruthy()
	})

	it('アップグレード押下で準備中の案内が出る（ペイウォールは #収益2 で結線）', async () => {
		const alertSpy = jest.spyOn(Alert, 'alert')
		const { getByText } = await render(<SettingsScreen />)
		fireEvent.press(getByText('アップグレード'))
		expect(alertSpy).toHaveBeenCalled()
	})
})

describe('その他セクション', () => {
	it('購入を復元する・レビューを書く・要望・問い合わせの行が表示される', async () => {
		const { getByText } = await render(<SettingsScreen />)
		expect(getByText('購入を復元する')).toBeTruthy()
		expect(getByText('レビューを書く')).toBeTruthy()
		expect(getByText('要望・問い合わせ')).toBeTruthy()
	})

	it('購入を復元する押下で準備中の案内が出る（RevenueCat は #7 で結線）', async () => {
		const alertSpy = jest.spyOn(Alert, 'alert')
		const { getByText } = await render(<SettingsScreen />)
		fireEvent.press(getByText('購入を復元する'))
		expect(alertSpy).toHaveBeenCalled()
	})

	it('レビューを書く押下でストアレビューを要求する', async () => {
		const { getByText } = await render(<SettingsScreen />)
		fireEvent.press(getByText('レビューを書く'))
		expect(writeReview).toHaveBeenCalledTimes(1)
	})

	it('要望・問い合わせ押下でメールリンクを開く', async () => {
		const { getByText } = await render(<SettingsScreen />)
		fireEvent.press(getByText('要望・問い合わせ'))
		expect(contactSupport).toHaveBeenCalledTimes(1)
	})
})
