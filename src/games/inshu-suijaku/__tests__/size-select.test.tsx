import { act, fireEvent, render } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { customPunishmentsStore } from '@/lib/custom-punishments-store'
import { SizeSelect } from '../size-select'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

beforeEach(async () => {
	await AsyncStorage.clear()
	await customPunishmentsStore.hydrate()
	jest.clearAllMocks()
})

it('3サイズが表示され、選択してスタートすると onStart が呼ばれる', async () => {
	const onStart = jest.fn()
	const utils = await render(<SizeSelect onStart={onStart} />)
	expect(utils.getByText(/小 4×4/)).toBeTruthy()
	expect(utils.getByText(/中 4×5/)).toBeTruthy()
	expect(utils.getByText(/大 5×6/)).toBeTruthy()
	expect(utils.getByText(/7ペア/)).toBeTruthy()

	await act(async () => {
		fireEvent.press(utils.getByText(/中 4×5/))
	})
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	expect(onStart).toHaveBeenCalledWith('medium')
})

it('未選択でもデフォルト（小）でスタートできる', async () => {
	const onStart = jest.fn()
	const utils = await render(<SizeSelect onStart={onStart} />)
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	expect(onStart).toHaveBeenCalledWith('small')
})

it('カスタムお題の入口行が表示される', async () => {
	const utils = await render(<SizeSelect onStart={jest.fn()} />)
	expect(utils.getByTestId('icon-crown')).toBeTruthy()
	expect(utils.queryByText('👑')).toBeNull()
	expect(utils.getByText('カスタムお題')).toBeTruthy()
	expect(utils.getByText('自分たちの罰ゲームを追加')).toBeTruthy()
	expect(utils.getByText('0件 有効')).toBeTruthy()
})

it('カスタムお題入口をタップするとシートが開く', async () => {
	const utils = await render(<SizeSelect onStart={jest.fn()} />)
	await act(async () => {
		fireEvent.press(utils.getByText('カスタムお題'))
	})
	expect(utils.getByText('マイセット')).toBeTruthy()
	expect(utils.getByText('デッキに混ぜる')).toBeTruthy()
})

it('カスタムお題の有効件数を表示する', async () => {
	await customPunishmentsStore.addItem('normal', '通常1')
	await customPunishmentsStore.addItem('normal', '通常2')
	await customPunishmentsStore.addItem('special', '特大1')
	const utils = await render(<SizeSelect onStart={jest.fn()} />)
	expect(utils.getByText('3件 有効')).toBeTruthy()
})

it('カスタムお題がオフなら「オフ」と表示する', async () => {
	await customPunishmentsStore.addItem('normal', '通常1')
	await customPunishmentsStore.setEnabled(false)
	const utils = await render(<SizeSelect onStart={jest.fn()} />)
	expect(utils.getByText('オフ')).toBeTruthy()
})
