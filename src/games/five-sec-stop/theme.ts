import { colors } from '@/theme/tokens'
import type { Tier } from './judge'

// 5秒STOP のゲームカラー（registry の gradient と同系のティール基調）
export const FSS = {
	bg: colors.background,
	accent: '#4ECDC4',
	tierColors: {
		pittari: colors.gold,
		good: '#4ECDC4',
		close: '#F7B731',
		far: '#FF6B6B',
	} satisfies Record<Tier, string>,
} as const
