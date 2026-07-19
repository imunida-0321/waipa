import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { useTrialRoundConsumer } from '@/lib/trial-store'
import { useTopics, type Topic } from '@/lib/topics-store'
import { useEffect, useReducer, useRef, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { CalibrationScreen } from './calibration-screen'
import {
	MEASURE_MS,
	METER_INTERVAL_MS,
	ROUNDS,
	normalizeDb,
	voiceRange,
	type VoiceRange,
} from './engine'
import { initialState, reduce } from './reducer'
import { ResultScreen } from './result-screen'
import { pickWhisperTopic } from './topics'
import { SL } from './theme'
import { useMicLevel } from './use-mic-level'
import { VolumeGauge } from './volume-gauge'

type Stage = 'permission' | 'calibration' | 'playing'

const JUDGEMENT_LABELS = {
	low: '🔻 小さすぎ…',
	ok: '✅ 緑ゾーン内！',
	high: '🔺 大きすぎ！',
} as const

export function SasayakiLimitGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const { topics } = useTopics()
	const mic = useMicLevel()

	const [stage, setStage] = useState<Stage>('permission')
	const [range, setRange] = useState<VoiceRange | null>(null)
	const [state, dispatch] = useReducer(reduce, players.count, (n) => initialState(n, Math.random))
	const [liveLevel, setLiveLevel] = useState(0)
	const [topic, setTopic] = useState<Topic | null>(null)
	const usedIdsRef = useRef<string[]>([])
	const peakRef = useRef(0)
	const levelDbRef = useRef(mic.levelDb)
	useTrialRoundConsumer('sasayaki-limit', state.phase === 'result')

	useEffect(() => {
		levelDbRef.current = mic.levelDb
	})

	// マイク権限（初回マウント時にリクエスト。許可済みなら即 resolve される）
	useEffect(() => {
		if (stage !== 'permission' || mic.permission === 'denied') return
		mic.requestPermission().then((granted) => {
			if (granted) setStage('calibration')
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stage, mic.permission])

	// キャリブレーション・計測中はマイクを回す
	const shouldRecord =
		mic.meteringSupported !== false &&
		(stage === 'calibration' || (stage === 'playing' && state.phase === 'measuring'))
	useEffect(() => {
		if (!shouldRecord) return
		mic.start()
		return () => {
			mic.stop()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldRecord])

	// speech に入るたびにお題を引く
	useEffect(() => {
		if (stage !== 'playing' || state.phase !== 'speech') return
		const next = pickWhisperTopic(topics, usedIdsRef.current, Math.random)
		usedIdsRef.current = [...usedIdsRef.current, next.id]
		setTopic(next)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stage, state.phase, state.turnPos, state.round])

	// 3秒計測: METER_INTERVAL_MS ごとにサンプリングし、終了で measured を dispatch
	useEffect(() => {
		if (stage !== 'playing' || state.phase !== 'measuring' || range == null) return
		const sampler = setInterval(() => {
			const norm = normalizeDb(levelDbRef.current, range)
			peakRef.current = Math.max(peakRef.current, norm)
			setLiveLevel(norm)
		}, METER_INTERVAL_MS)
		const finish = setTimeout(() => {
			clearInterval(sampler)
			dispatch({ type: 'measured', peakNorm: peakRef.current })
		}, MEASURE_MS)
		return () => {
			clearInterval(sampler)
			clearTimeout(finish)
		}
	}, [stage, state.phase, range])

	if (mic.permission === 'denied') {
		return (
			<View style={styles.center}>
				<Text style={styles.guardTitle}>🎤 マイクの許可が必要です</Text>
				<Text style={styles.guardText}>
					このゲームは声の大きさで遊びます。{'\n'}設定からマイクを許可してね。{'\n'}
					録音は保存されません。
				</Text>
				<Pressable style={styles.mainButton} onPress={() => Linking.openSettings()}>
					<Text style={styles.mainButtonLabel}>設定を開く</Text>
				</Pressable>
			</View>
		)
	}
	if (mic.meteringSupported === false) {
		return (
			<View style={styles.center}>
				<Text style={styles.guardTitle}>この端末ではマイクを利用できません</Text>
				<Text style={styles.guardText}>
					音量の計測に対応していないため、このゲームは遊べません。
				</Text>
			</View>
		)
	}
	if (stage === 'permission') {
		return <View style={styles.center} />
	}
	if (stage === 'calibration') {
		return (
			<CalibrationScreen
				levelDb={mic.levelDb}
				onConfirm={(noiseFloorDb) => {
					setRange(voiceRange(noiseFloorDb))
					setStage('playing')
				}}
			/>
		)
	}

	const currentPlayer = state.activePlayers[state.turnPos]

	if (state.phase === 'result') {
		return (
			<ResultScreen
				names={names}
				successCounts={state.successCounts}
				losers={state.losers}
				onRetry={() => dispatch({ type: 'retry', rng: Math.random })}
			/>
		)
	}
	if (state.phase === 'round-result') {
		return (
			<View style={styles.center}>
				<Text style={styles.heading}>ラウンド {state.round} おわり！</Text>
				<View style={styles.scoreList}>
					{names.map((name, i) => (
						<Text key={i} style={styles.scoreRow}>
							{name}：{state.successCounts[i]} 成功
						</Text>
					))}
				</View>
				<Text style={styles.guardText}>次のラウンドはゾーンが狭くなるよ！</Text>
				<Pressable
					style={styles.mainButton}
					onPress={() => dispatch({ type: 'nextRound', rng: Math.random })}
				>
					<Text style={styles.mainButtonLabel}>ラウンド {state.round + 1} へ</Text>
				</Pressable>
			</View>
		)
	}
	if (state.phase === 'sudden-death-intro') {
		return (
			<View style={styles.center}>
				<Text style={styles.heading}>⚡ サドンデス！</Text>
				<Text style={styles.guardText}>
					{state.activePlayers.map((i) => names[i]).join(' vs ')}
					{'\n'}極狭ゾーンで1発勝負。外したら負け！
				</Text>
				<Pressable style={styles.mainButton} onPress={() => dispatch({ type: 'sdStart' })}>
					<Text style={styles.mainButtonLabel}>はじめる</Text>
				</Pressable>
			</View>
		)
	}

	// speech / measuring / judged 共通レイアウト
	return (
		<View style={styles.playContainer}>
			<Text style={styles.roundLabel}>
				{state.suddenDeath ? '⚡ サドンデス' : `ラウンド ${state.round} / ${ROUNDS}`}
			</Text>
			<Text style={styles.playerName}>{names[currentPlayer]}</Text>
			{topic != null && <Text style={styles.topicText}>「{topic.text}」</Text>}
			<View style={styles.gaugeRow}>
				<VolumeGauge
					level={liveLevel}
					peak={state.lastPeak}
					zone={state.zone}
					active={state.phase === 'measuring'}
				/>
			</View>
			{state.phase === 'speech' && (
				<Pressable
					style={styles.mainButton}
					onPress={() => {
						peakRef.current = 0
						setLiveLevel(0)
						dispatch({ type: 'startMeasure' })
					}}
				>
					<Text style={styles.mainButtonLabel}>タップして発声スタート</Text>
				</Pressable>
			)}
			{state.phase === 'measuring' && (
				<Text style={styles.measuringLabel}>🎤 いまだ！言え！</Text>
			)}
			{state.phase === 'judged' && state.lastJudgement != null && (
				<>
					<Text style={styles.judgement}>{JUDGEMENT_LABELS[state.lastJudgement]}</Text>
					<Pressable
						style={styles.mainButton}
						onPress={() => dispatch({ type: 'next', rng: Math.random })}
					>
						<Text style={styles.mainButtonLabel}>つぎの人へ</Text>
					</Pressable>
				</>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
	playContainer: { flex: 1, alignItems: 'center', paddingTop: 32, gap: 12, padding: 24 },
	heading: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
	guardTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
	guardText: { color: SL.sub, fontSize: 14, textAlign: 'center', lineHeight: 22 },
	roundLabel: { color: SL.sub, fontSize: 14 },
	playerName: { color: SL.green, fontSize: 24, fontWeight: '800' },
	topicText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', textAlign: 'center' },
	gaugeRow: { flex: 1, justifyContent: 'center' },
	measuringLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
	judgement: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
	scoreList: { gap: 6, alignItems: 'center' },
	scoreRow: { color: '#FFFFFF', fontSize: 16 },
	mainButton: {
		paddingHorizontal: 36,
		paddingVertical: 14,
		borderRadius: 999,
		backgroundColor: SL.green,
	},
	mainButtonLabel: { color: '#0B2818', fontSize: 16, fontWeight: '800' },
})
