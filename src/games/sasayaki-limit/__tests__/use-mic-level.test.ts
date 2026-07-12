import { act, renderHook } from '@testing-library/react-native'
import { SILENCE_DB } from '../engine'
import { useMicLevel } from '../use-mic-level'

let mockGranted = true
let mockState: { isRecording: boolean; metering?: number; durationMillis: number } = {
	isRecording: false,
	durationMillis: 0,
}
const mockRecorder = {
	prepareToRecordAsync: jest.fn(async () => {}),
	record: jest.fn(),
	stop: jest.fn(async () => {}),
	uri: 'file:///cache/rec.m4a',
}
const mockSetAudioMode = jest.fn(async (..._args: unknown[]) => {})

jest.mock('expo-audio', () => ({
	AudioModule: {
		requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: mockGranted })),
	},
	RecordingPresets: { HIGH_QUALITY: {} },
	setAudioModeAsync: (...args: unknown[]) => mockSetAudioMode(...args),
	useAudioRecorder: jest.fn(() => mockRecorder),
	useAudioRecorderState: jest.fn(() => mockState),
}))

const mockDelete = jest.fn()
jest.mock('expo-file-system', () => ({
	File: jest.fn(() => ({ delete: mockDelete })),
}))

beforeEach(() => {
	jest.clearAllMocks()
	mockGranted = true
	mockState = { isRecording: false, durationMillis: 0 }
})

describe('useMicLevel', () => {
	it('許可されると granted になり録音モードを設定する', async () => {
		const { result } = await renderHook(() => useMicLevel())
		expect(result.current.permission).toBe('pending')
		await act(async () => {
			await result.current.requestPermission()
		})
		expect(result.current.permission).toBe('granted')
		expect(mockSetAudioMode).toHaveBeenCalledWith({
			allowsRecording: true,
			playsInSilentMode: true,
		})
	})
	it('拒否されると denied になる', async () => {
		mockGranted = false
		const { result } = await renderHook(() => useMicLevel())
		await act(async () => {
			await result.current.requestPermission()
		})
		expect(result.current.permission).toBe('denied')
	})
	it('非録音中の levelDb は無音、録音中は metering 値', async () => {
		const { result, rerender } = await renderHook(() => useMicLevel())
		expect(result.current.levelDb).toBe(SILENCE_DB)
		mockState = { isRecording: true, metering: -23.5, durationMillis: 100 }
		await act(async () => {
			rerender({})
		})
		expect(result.current.levelDb).toBe(-23.5)
		expect(result.current.meteringSupported).toBe(true)
	})
	it('stop で録音ファイルを削除する', async () => {
		const { result } = await renderHook(() => useMicLevel())
		await act(async () => {
			await result.current.stop()
		})
		expect(mockRecorder.stop).toHaveBeenCalled()
		expect(mockDelete).toHaveBeenCalled()
	})
	it('アンマウント時に録音モードを解除する', async () => {
		const { unmount } = await renderHook(() => useMicLevel())
		await act(async () => {
			unmount()
		})
		expect(mockSetAudioMode).toHaveBeenCalledWith({
			allowsRecording: false,
			playsInSilentMode: true,
		})
	})
})
