import { DiceCanvas } from '@/components/dice-3d/dice-canvas'
import { CHIN } from './theme'

export type Dice3DProps = {
	/** 表示する出目（3個）。rolling 中も最終姿勢の計算に使う */
	dice: [number, number, number]
	/** この投がションベンか（先頭の1個がリング外へ） */
	shonben: boolean
	/** true の間タンブルアニメ再生。false なら最終姿勢で静止表示 */
	rolling: boolean
	/** 投を識別する key。変わるたびにアニメをリスタート */
	rollId: number
	/** アニメ長 ms（既定 1200 = chinchiro-play の ROLL_DURATION_MS と同じ） */
	durationMs?: number
}

const CANVAS_HEIGHT = 260
const RING_COLOR = '#8A8264'

export function Dice3D({ dice, shonben, rolling, rollId, durationMs = 1200 }: Dice3DProps) {
	return (
		<DiceCanvas
			dice={dice}
			shonben={shonben}
			rolling={rolling}
			rollId={rollId}
			durationMs={durationMs}
			backgroundColor={CHIN.bg}
			ringColor={RING_COLOR}
			height={CANVAS_HEIGHT}
			testID="dice-3d"
		/>
	)
}
