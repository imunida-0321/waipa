import { DiceCanvas } from '@/components/dice-3d/dice-canvas'

export type DiceRoll3DProps = {
	/** 表示する出目（2個）。rolling 中も最終姿勢の計算に使う */
	dice: [number, number]
	/** true の間タンブルアニメ再生。false なら最終姿勢で静止表示 */
	rolling: boolean
	/** 投を識別する key。変わるたびにアニメをリスタート */
	rollId: number
	/** アニメ長 ms（既定 1200） */
	durationMs?: number
}

/** 転がりアニメの既定時間（消費側が転がり演出の長さとして import する） */
export const ROLL_ANIM_MS = 1200

const CANVAS_HEIGHT = 260
// 背景色・鏡面床の色（ダーク赤紫。ダウトダイスの世界観に合わせた専用色）
const BG_COLOR = '#1B1030'

export function DiceRoll3D({ dice, rolling, rollId, durationMs = ROLL_ANIM_MS }: DiceRoll3DProps) {
	return (
		<DiceCanvas
			dice={dice}
			rolling={rolling}
			rollId={rollId}
			durationMs={durationMs}
			backgroundColor={BG_COLOR}
			height={CANVAS_HEIGHT}
			testID="dice-roll-3d"
		/>
	)
}
