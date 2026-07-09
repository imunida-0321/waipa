import { Quaternion, Vector3 } from 'three'
import {
	DIE_HALF,
	FACE_NORMALS,
	MIN_DICE_DISTANCE,
	PIP_OFFSETS,
	RING_RADIUS,
	faceUpQuaternion,
	finalPose,
	shonbenPose,
	tumbleProgress,
	tumbleQuaternion,
	type DieFace,
} from '../dice-3d-math'

// テスト用の決定的シード付き疑似乱数（LCG）
function lcg(seed: number): () => number {
	let s = seed >>> 0
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0
		return s / 4294967296
	}
}

const FACES: DieFace[] = [1, 2, 3, 4, 5, 6]

function quatOf([x, y, z, w]: [number, number, number, number]): Quaternion {
	return new Quaternion(x, y, z, w)
}

describe('faceUpQuaternion', () => {
	it.each(FACES)('出目 %d: 面法線を回すと +Y を向く（誤差 1e-6 以内）', (v) => {
		const q = quatOf(faceUpQuaternion(v))
		expect(Math.abs(q.length() - 1)).toBeLessThan(1e-6)
		const n = new Vector3(...FACE_NORMALS[v]).applyQuaternion(q)
		expect(Math.abs(n.x)).toBeLessThan(1e-6)
		expect(Math.abs(n.y - 1)).toBeLessThan(1e-6)
		expect(Math.abs(n.z)).toBeLessThan(1e-6)
	})

	it('標準ダイス配置: 対面の和が7（1-6 / 2-5 / 3-4 の法線が正反対）', () => {
		const pairs: [DieFace, DieFace][] = [
			[1, 6],
			[2, 5],
			[3, 4],
		]
		for (const [a, b] of pairs) {
			const na = new Vector3(...FACE_NORMALS[a])
			const nb = new Vector3(...FACE_NORMALS[b])
			expect(na.dot(nb)).toBeCloseTo(-1, 6)
		}
	})
})

describe('finalPose', () => {
	it('100シードで リング内・床上・抽選済みの目が上面・相互距離下限 を満たす', () => {
		for (let seed = 1; seed <= 100; seed++) {
			const rng = lcg(seed)
			const dice: DieFace[] = [
				((seed % 6) + 1) as DieFace,
				(((seed + 2) % 6) + 1) as DieFace,
				(((seed + 4) % 6) + 1) as DieFace,
			]
			const poses = dice.map((v, i) => finalPose(v, i, rng))

			poses.forEach((p, i) => {
				const [x, y, z] = p.position
				// リング半径からサイコロ半分を引いた範囲に収まる
				expect(Math.hypot(x, z)).toBeLessThanOrEqual(RING_RADIUS - DIE_HALF)
				// 床の上に静止（中心はサイコロ半分の高さ）
				expect(y).toBeCloseTo(DIE_HALF, 6)
				// ランダム yaw を合成しても、抽選済みの目が真上を向いたまま
				const up = new Vector3(...FACE_NORMALS[dice[i]]).applyQuaternion(
					quatOf(p.quaternion),
				)
				expect(Math.abs(up.y - 1)).toBeLessThan(1e-6)
			})

			for (let i = 0; i < poses.length; i++) {
				for (let j = i + 1; j < poses.length; j++) {
					const [ax, , az] = poses[i].position
					const [bx, , bz] = poses[j].position
					expect(Math.hypot(ax - bx, az - bz)).toBeGreaterThanOrEqual(MIN_DICE_DISTANCE)
				}
			}
		}
	})
})

describe('shonbenPose', () => {
	it('100シードで リング半径の1.4倍以遠に転がり出て、単位クォータニオンを返す', () => {
		for (let seed = 1; seed <= 100; seed++) {
			const rng = lcg(seed)
			const p = shonbenPose(0, rng)
			const [x, y, z] = p.position
			expect(Math.hypot(x, z)).toBeGreaterThanOrEqual(RING_RADIUS * 1.4)
			expect(y).toBeCloseTo(DIE_HALF, 6)
			expect(Math.abs(quatOf(p.quaternion).length() - 1)).toBeLessThan(1e-6)
		}
	})
})

describe('tumbleProgress', () => {
	it('ease は 0→1 に単調増加する', () => {
		expect(tumbleProgress(0).ease).toBeCloseTo(0, 6)
		expect(tumbleProgress(1).ease).toBeCloseTo(1, 6)
		let prev = -1
		for (let i = 0; i <= 100; i++) {
			const { ease } = tumbleProgress(i / 100)
			expect(ease).toBeGreaterThanOrEqual(prev)
			prev = ease
		}
	})

	it('bounceY は非負で t=1 で 0 になり、後半ほど減衰する', () => {
		expect(tumbleProgress(1).bounceY).toBeCloseTo(0, 6)
		let firstMax = 0
		let lastMax = 0
		for (let i = 0; i <= 100; i++) {
			const t = i / 100
			const { bounceY } = tumbleProgress(t)
			expect(bounceY).toBeGreaterThanOrEqual(0)
			if (t < 1 / 3) firstMax = Math.max(firstMax, bounceY)
			if (t > 2 / 3) lastMax = Math.max(lastMax, bounceY)
		}
		expect(firstMax).toBeGreaterThan(0)
		expect(lastMax).toBeLessThan(firstMax)
	})
})

describe('tumbleQuaternion', () => {
	const qf = faceUpQuaternion(3)

	it('easedT=1 で最終姿勢に厳密一致する', () => {
		const q = quatOf(tumbleQuaternion(qf, [0.3, 0.8, -0.2], Math.PI * 5, 1))
		const dot = Math.abs(q.dot(quatOf(qf)))
		expect(Math.abs(dot - 1)).toBeLessThan(1e-9)
	})

	it('easedT=0 では余分回転のぶん最終姿勢と異なる', () => {
		const q = quatOf(tumbleQuaternion(qf, [0, 1, 0], Math.PI * 5, 0))
		const dot = Math.abs(q.dot(quatOf(qf)))
		expect(dot).toBeLessThan(0.99)
	})

	it('easedT の途中でも単位クォータニオンを保つ', () => {
		for (const t of [0, 0.25, 0.5, 0.75, 1]) {
			const q = quatOf(tumbleQuaternion(qf, [0.5, -0.3, 0.8], Math.PI * 4.6, t))
			expect(Math.abs(q.length() - 1)).toBeLessThan(1e-6)
		}
	})

	it('軸がゼロベクトルでも破綻しない', () => {
		const q = quatOf(tumbleQuaternion(qf, [0, 0, 0], Math.PI * 4, 0.5))
		expect(Math.abs(q.length() - 1)).toBeLessThan(1e-6)
	})
})

describe('PIP_OFFSETS', () => {
	it.each(FACES)('出目 %d のピップ数が一致する', (v) => {
		expect(PIP_OFFSETS[v]).toHaveLength(v)
	})
})
