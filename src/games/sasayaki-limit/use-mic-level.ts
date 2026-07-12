// expo-audio の録音 metering ラッパー。録音データは判定にしか使わず stop 時に即削除する
import {
	AudioModule,
	RecordingPresets,
	setAudioModeAsync,
	useAudioRecorder,
	useAudioRecorderState,
} from 'expo-audio'
import { File } from 'expo-file-system'
import { useCallback, useEffect, useRef, useState } from 'react'
import { METER_INTERVAL_MS, SILENCE_DB } from './engine'

export type MicPermission = 'pending' | 'granted' | 'denied'

// metering 値が来ないまま録音がこの時間続いたら「非対応端末」と判断
const METERING_DETECT_MS = 600

export function useMicLevel(intervalMs: number = METER_INTERVAL_MS) {
	const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true })
	const recorderState = useAudioRecorderState(recorder, intervalMs)
	const [permission, setPermission] = useState<MicPermission>('pending')
	const [meteringSupported, setMeteringSupported] = useState<boolean | null>(null)
	const recordStartRef = useRef<number | null>(null)

	const requestPermission = useCallback(async () => {
		const res = await AudioModule.requestRecordingPermissionsAsync()
		if (res.granted) {
			await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
			setPermission('granted')
		} else {
			setPermission('denied')
		}
		return res.granted
	}, [])

	const start = useCallback(async () => {
		await recorder.prepareToRecordAsync()
		recorder.record()
	}, [recorder])

	const stop = useCallback(async () => {
		await recorder.stop()
		const uri = recorder.uri
		if (uri) {
			try {
				new File(uri).delete()
			} catch {
				// キャッシュ領域なので削除失敗は無視（OS が回収する）
			}
		}
	}, [recorder])

	useEffect(() => {
		if (!recorderState.isRecording) {
			recordStartRef.current = null
			return
		}
		if (recordStartRef.current == null) recordStartRef.current = Date.now()
		if (typeof recorderState.metering === 'number') {
			setMeteringSupported(true)
		} else if (Date.now() - recordStartRef.current > METERING_DETECT_MS) {
			setMeteringSupported(false)
		}
	}, [recorderState])

	const levelDb =
		recorderState.isRecording && typeof recorderState.metering === 'number'
			? recorderState.metering
			: SILENCE_DB

	return {
		permission,
		requestPermission,
		start,
		stop,
		levelDb,
		isRecording: recorderState.isRecording,
		meteringSupported,
	}
}
