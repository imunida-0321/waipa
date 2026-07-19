import { act, fireEvent, render } from '@testing-library/react-native'
import { MEASURE_MS } from '../engine'
import { SasayakiLimitGame } from '../sasayaki-limit-game'

jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: { View },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
	}
})
jest.mock('@/lib/players-store', () => ({
	usePlayers: jest.fn(() => ({ count: 2, names: ['あか', 'あお'], history: [] })),
	getDisplayNames: jest.fn(() => ['あか', 'あお']),
}))
jest.mock('@/lib/topics-store', () => ({
	useTopics: jest.fn(() => ({ topics: [], fetchedAt: null })),
}))

const mockRequestPermission = jest.fn(async () => true)
const mockStart = jest.fn(async () => {})
const mockStop = jest.fn(async () => {})
let mockMic = {
	permission: 'pending' as string,
	requestPermission: mockRequestPermission,
	start: mockStart,
	stop: mockStop,
	levelDb: -30,
	isRecording: false,
	meteringSupported: true as boolean | null,
}
jest.mock('../use-mic-level', () => ({
	useMicLevel: jest.fn(() => mockMic),
}))

beforeEach(() => {
	jest.useFakeTimers()
	jest.clearAllMocks()
	mockMic = {
		permission: 'granted',
		requestPermission: mockRequestPermission,
		start: mockStart,
		stop: mockStop,
		levelDb: -30,
		isRecording: false,
		meteringSupported: true,
	}
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

async function completeSpeech(utils: Awaited<ReturnType<typeof render>>, levelDb: number) {
	mockMic = { ...mockMic, levelDb }
	await act(async () => {
		fireEvent.press(utils.getByText('タップして発声スタート'))
	})
	await act(async () => {
		jest.advanceTimersByTime(MEASURE_MS + 200)
	})
	await act(async () => {
		fireEvent.press(utils.getByText('つぎの人へ'))
	})
}

type TrialStoreModule = {
	useTrialRoundConsumer: (gameId: string, isRoundEnd: boolean) => void
}

function spyTrialRoundConsumer() {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const module = require('@/lib/trial-store') as TrialStoreModule
	return jest.spyOn(module, 'useTrialRoundConsumer').mockImplementation(() => {})
}

describe('SasayakiLimitGame', () => {
	it('権限拒否で案内画面が出る', async () => {
		mockMic = { ...mockMic, permission: 'denied' }
		const { getByText } = await render(<SasayakiLimitGame />)
		expect(getByText(/マイクの許可が必要/)).toBeTruthy()
	})
	it('metering 非対応端末はガード表示', async () => {
		mockMic = { ...mockMic, meteringSupported: false }
		const { getByText } = await render(<SasayakiLimitGame />)
		expect(getByText(/この端末ではマイクを利用できません/)).toBeTruthy()
	})
	it('metering 非対応端末ではマイクを回さない', async () => {
		mockMic = { ...mockMic, meteringSupported: false }
		const { getByText } = await render(<SasayakiLimitGame />)
		expect(getByText(/この端末ではマイクを利用できません/)).toBeTruthy()
		expect(mockStart).not.toHaveBeenCalled()
	})
	it('キャリブレーション → speech → 3秒計測 → 判定まで流れる', async () => {
		const { getByText } = await render(<SasayakiLimitGame />)
		// キャリブレーション（3秒）
		await act(async () => {
			jest.advanceTimersByTime(3100)
		})
		await act(async () => {
			fireEvent.press(getByText('スタート'))
		})
		// speech: 1人目のお題とスタートボタン
		expect(getByText('あか')).toBeTruthy()
		await act(async () => {
			fireEvent.press(getByText('タップして発声スタート'))
		})
		// measuring: 3秒経過で判定へ
		await act(async () => {
			jest.advanceTimersByTime(MEASURE_MS + 200)
		})
		expect(getByText('つぎの人へ')).toBeTruthy()
	})

	it('決着画面到達でトライアルの1ラウンドを消費する', async () => {
		const consumerSpy = spyTrialRoundConsumer()
		jest.spyOn(Math, 'random').mockReturnValue(0)
		const utils = await render(<SasayakiLimitGame />)
		await act(async () => {
			jest.advanceTimersByTime(3100)
		})
		await act(async () => {
			fireEvent.press(utils.getByText('スタート'))
		})

		for (let round = 1; round <= 3; round++) {
			await completeSpeech(utils, -30)
			await completeSpeech(utils, -2)
			if (round < 3) {
				await act(async () => {
					fireEvent.press(utils.getByText(`ラウンド ${round + 1} へ`))
				})
			}
		}

		expect(utils.getByText('結果発表')).toBeTruthy()
		expect(consumerSpy).toHaveBeenCalledWith('sasayaki-limit', true)
	})
})
