import type { TextStyle } from 'react-native'

// CLAUDE.md「デザインコンセプト > カラートークン」準拠
export const colors = {
	background: '#17142A',
	surface: '#211D3A',
	surfaceBorder: '#332E52',
	accentFrom: '#E85BF7',
	accentTo: '#7B5CFA',
	text: '#FFFFFF',
	textMuted: '#9A94B8',
	success: '#34C759',
	danger: '#FF4D4F',
	gold: '#FFC53D',
} as const

export const spacing = {
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
} as const

export const radii = {
	sm: 8,
	md: 16,
	lg: 24,
	pill: 999,
} as const

export const typography = {
	hero: { fontSize: 32, fontWeight: '800', color: colors.text },
	title: { fontSize: 22, fontWeight: '700', color: colors.text },
	body: { fontSize: 16, fontWeight: '400', color: colors.text },
	caption: { fontSize: 13, fontWeight: '400', color: colors.textMuted },
} as const satisfies Record<string, TextStyle>
