import { useCallback, useEffect, useRef, useState } from 'react'
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { assignSlot, amountToSlots, needsSpin, pickPlayerIndex, type DigitSlot } from './payment'
import { nextAngleForSegment, wheelRepeats } from './spin'

const SPIN_DURATION = 3500

function firstNeedsSpinIndex(slots: DigitSlot[]): number | null {
	const found = slots.find(needsSpin)
	return found ? found.index : null
}

function nextNeedsSpinIndex(slots: DigitSlot[], afterIndex: number): number | null {
	const found = slots.find((s) => s.index > afterIndex && needsSpin(s))
	return found ? found.index : null
}

type PendingSpin = { targetIndex: number; playerIndex: number } | null

export function useDigitRoulette(amount: number, playerCount: number) {
	const [slots, setSlots] = useState(() => amountToSlots(amount))
	const [currentIndex, setCurrentIndex] = useState(() => firstNeedsSpinIndex(slots))
	const [isSpinning, setIsSpinning] = useState(false)
	const [allDone, setAllDone] = useState(() => firstNeedsSpinIndex(slots) === null)
	const [pending, setPending] = useState<PendingSpin>(null)
	const rotation = useSharedValue(0)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const slotsRef = useRef(slots)

	const spin = useCallback(() => {
		if (isSpinning || allDone || currentIndex === null) return

		const targetIndex = currentIndex
		const playerIndex = pickPlayerIndex(playerCount)

		setIsSpinning(true)
		playSound('spin')
		setPending({ targetIndex, playerIndex })
	}, [isSpinning, allDone, currentIndex, playerCount])

	useEffect(() => {
		if (!pending) return

		const { targetIndex, playerIndex } = pending
		// 当選プレイヤーが盤上に持つ repeats 個のセグメント（playerIndex, +playerCount, ...）
		// から1つをランダムに選び、その中心で止める。描画と同じ wheelRepeats を参照。
		const repeats = wheelRepeats(playerCount)
		const total = playerCount * repeats
		const segment = playerIndex + playerCount * Math.floor(Math.random() * repeats)
		// 累積値に足すのではなく、現在角を基準に絶対目標角を作る（複数スピンでもズレない）
		rotation.value = withTiming(nextAngleForSegment(rotation.value, segment, total), {
			duration: SPIN_DURATION,
			easing: Easing.out(Easing.cubic),
		})

		timerRef.current = setTimeout(() => {
			const updated = assignSlot(slotsRef.current, targetIndex, playerIndex)
			const next = nextNeedsSpinIndex(updated, targetIndex)
			slotsRef.current = updated
			setSlots(updated)
			setCurrentIndex(next)
			setAllDone(next === null)
			void haptics.heavy()
			playSound('reveal')
			setIsSpinning(false)
			setPending(null)
			timerRef.current = null
		}, SPIN_DURATION)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pending])

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current)
		},
		[],
	)

	return { slots, currentIndex, isSpinning, allDone, spin, rotation }
}
