import { useCallback, useEffect, useRef, useState } from 'react'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'

export type DrumrollPhase = 'idle' | 'rolling' | 'revealed'

// 「ダラダラダラ…ドン！」のタメ→発表を管理するフック。
// 見た目は DrumrollReveal 等の表示部品側で自由に組み替える（ゲームごとに演出を変える方針）
export function useDrumroll(durationMs = 2000) {
	const [phase, setPhase] = useState<DrumrollPhase>('idle')
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

	const start = useCallback(() => {
		setPhase('rolling')
		playSound('drumroll')
		timer.current = setTimeout(() => {
			setPhase('revealed')
			haptics.heavy()
			playSound('reveal')
		}, durationMs)
	}, [durationMs])

	const reset = useCallback(() => {
		if (timer.current) clearTimeout(timer.current)
		setPhase('idle')
	}, [])

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current)
		},
		[],
	)

	return { phase, start, reset }
}
