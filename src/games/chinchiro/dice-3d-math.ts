import { Quaternion, Vector3 } from 'three'

// チンチロ3D演出の姿勢・散布計算（GL 非依存の純関数）。
// 座標系: y=0 が床、+Y が真上、+Z がカメラ手前方向。

export type DieFace = 1 | 2 | 3 | 4 | 5 | 6
export type Vec3 = [number, number, number]
export type Quat = [number, number, number, number]
export type Pose = { position: Vec3; quaternion: Quat }

/** サイコロ1辺の長さ（ワールド単位） */
export const DIE_SIZE = 0.62
/** サイコロ中心の床からの高さ（=静止時の y） */
export const DIE_HALF = DIE_SIZE / 2
/** 丼の縁リングの半径 */
export const RING_RADIUS = 1.6
/** 静止したサイコロ同士の中心間距離の下限（構成上保証される値） */
export const MIN_DICE_DISTANCE = 0.72

const SECTOR = (Math.PI * 2) / 3
const ANGLE_JITTER = 0.3
const SCATTER_MIN = 0.55
const SCATTER_MAX = 1.0
const BOUNCE_HEIGHT = 1.1
const BOUNCE_COUNT = 3

// 標準ダイス配置（対面の和=7）: 1-6 / 2-5 / 3-4。ローカル空間での各面の法線
export const FACE_NORMALS: Record<DieFace, Vec3> = {
	1: [0, 1, 0],
	2: [0, 0, 1],
	3: [1, 0, 0],
	4: [-1, 0, 0],
	5: [0, 0, -1],
	6: [0, -1, 0],
}

/** 各面のピップ配置（面ローカル -1..1 の単位座標。描画側で面サイズに合わせてスケール） */
export const PIP_OFFSETS: Record<DieFace, [number, number][]> = {
	1: [[0, 0]],
	2: [
		[-1, 1],
		[1, -1],
	],
	3: [
		[-1, 1],
		[0, 0],
		[1, -1],
	],
	4: [
		[-1, -1],
		[-1, 1],
		[1, -1],
		[1, 1],
	],
	5: [
		[-1, -1],
		[-1, 1],
		[0, 0],
		[1, -1],
		[1, 1],
	],
	6: [
		[-1, -1],
		[-1, 0],
		[-1, 1],
		[1, -1],
		[1, 0],
		[1, 1],
	],
}

const UP = new Vector3(0, 1, 0)
const X_AXIS = new Vector3(1, 0, 0)
const Z_AXIS = new Vector3(0, 0, 1)

// その目が真上（+Y）を向く回転。FACE_NORMALS[v] を applyQuaternion すると (0,1,0) になる
const FACE_UP_QUATERNIONS: Record<DieFace, Quat> = {
	1: toQuat(new Quaternion()),
	2: toQuat(new Quaternion().setFromAxisAngle(X_AXIS, -Math.PI / 2)),
	3: toQuat(new Quaternion().setFromAxisAngle(Z_AXIS, Math.PI / 2)),
	4: toQuat(new Quaternion().setFromAxisAngle(Z_AXIS, -Math.PI / 2)),
	5: toQuat(new Quaternion().setFromAxisAngle(X_AXIS, Math.PI / 2)),
	6: toQuat(new Quaternion().setFromAxisAngle(X_AXIS, Math.PI)),
}

function toQuat(q: Quaternion): Quat {
	return [q.x, q.y, q.z, q.w]
}

function fromQuat([x, y, z, w]: Quat): Quaternion {
	return new Quaternion(x, y, z, w)
}

/** 指定した目が真上（+Y）を向く姿勢クォータニオン */
export function faceUpQuaternion(value: DieFace): Quat {
	return [...FACE_UP_QUATERNIONS[value]]
}

/**
 * 最終姿勢: 抽選済みの目を上面にしたまま Y 軸ランダム yaw を合成し、
 * リング内に index ごとの扇形散布（120°セクター±揺らぎ）で配置する。
 * セクター間の最小角度差と最小半径から、相互距離 MIN_DICE_DISTANCE 以上が構成上保証される。
 */
export function finalPose(value: DieFace, index: number, rng: () => number): Pose {
	const yaw = rng() * Math.PI * 2
	const q = new Quaternion()
		.setFromAxisAngle(UP, yaw)
		.multiply(fromQuat(FACE_UP_QUATERNIONS[value]))
	const angle = index * SECTOR + (rng() - 0.5) * 2 * ANGLE_JITTER
	const radius = SCATTER_MIN + rng() * (SCATTER_MAX - SCATTER_MIN)
	return {
		position: [Math.sin(angle) * radius, DIE_HALF, Math.cos(angle) * radius],
		quaternion: toQuat(q),
	}
}

/** ションベン: リング外（半径の1.4倍以遠）の正面寄り（カメラ側 +Z）に転がり出た姿勢 */
export function shonbenPose(index: number, rng: () => number): Pose {
	const angle = (index - 1) * 0.3 + (rng() - 0.5) * 0.8
	const radius = RING_RADIUS * (1.45 + rng() * 0.4)
	const face = (Math.floor(rng() * 6) + 1) as DieFace
	const yaw = rng() * Math.PI * 2
	const q = new Quaternion()
		.setFromAxisAngle(UP, yaw)
		.multiply(fromQuat(FACE_UP_QUATERNIONS[face]))
	return {
		position: [Math.sin(angle) * radius, DIE_HALF, Math.cos(angle) * radius],
		quaternion: toQuat(q),
	}
}

/**
 * タンブル進行ヘルパー。
 * ease: ease-out cubic（0→1 単調増加）
 * bounceY: 減衰する放物線状のバウンド高さ（|sin| 3山 × (1-t)^2、t=1 で 0）
 */
export function tumbleProgress(t: number): { ease: number; bounceY: number } {
	const c = Math.min(Math.max(t, 0), 1)
	const ease = 1 - Math.pow(1 - c, 3)
	const decay = (1 - c) * (1 - c)
	const bounceY = Math.abs(Math.sin(c * Math.PI * BOUNCE_COUNT)) * decay * BOUNCE_HEIGHT
	return { ease, bounceY }
}

/**
 * タンブル中の姿勢: 最終姿勢 final に「ランダム軸まわりの残り回転」を合成する。
 * q(t) = final × R(axis, (1 - easedT) × totalAngle) なので、easedT=1 で厳密に final に一致し、
 * totalAngle に 2〜3 回転（4π〜6π）を渡せば slerp では表現できない多回転タンブルになる。
 */
export function tumbleQuaternion(
	final: Quat,
	axis: Vec3,
	totalAngle: number,
	easedT: number,
): Quat {
	const a = new Vector3(...axis)
	if (a.lengthSq() < 1e-12) a.set(1, 0, 0)
	a.normalize()
	const remainder = new Quaternion().setFromAxisAngle(a, (1 - easedT) * totalAngle)
	return toQuat(fromQuat(final).multiply(remainder))
}
