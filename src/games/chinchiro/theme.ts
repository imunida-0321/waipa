import { colors } from '@/theme/tokens'
import type { HandType } from './dice'

// チンチロのゲームカラー。丼は金縁×濃紫、サイコロはクリーム系（ダークネイビー背景に映える）
export const CHIN = {
	bg: colors.background,
	bowlRim: '#B8860B',
	bowlInner: '#241F3D',
	dieFace: '#F7F3E9',
	dieSideL: '#D9D2C0',
	dieSideR: '#BBB29C',
	pip: '#1E1A33',
	pipRed: '#C0392B',
	handColors: {
		pinzoro: colors.gold,
		arashi: colors.gold,
		shigoro: '#4ECDC4',
		me: colors.text,
		nome: '#F7B731',
		hifumi: '#FF6B6B',
	} satisfies Record<HandType, string>,
} as const
