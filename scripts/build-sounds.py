"""WaiPa 効果音ビルドスクリプト
Kenney.nl の CC0 素材 (OGG) を iOS/Android 両対応の WAV に変換し、
spin / drumroll / heartbeat はゲームの演出時間に合わせて素材から生成する。
出力: out/*.wav (44.1kHz mono 16bit)

Kenney の zip を展開したディレクトリが無い環境でも heartbeat 等の
自作合成パートだけは生成できるよう、素材読み込み(load_mono)に依存する
区間は try/except で個別にスキップする。
"""
import os
import glob
import numpy as np
import soundfile as sf

SR = 44100
OUT = 'out'
os.makedirs(OUT, exist_ok=True)


def load_mono(pattern: str) -> np.ndarray:
    path = sorted(glob.glob(pattern, recursive=True))[0]
    data, sr = sf.read(path)
    assert sr == SR, f'{path}: sr={sr}'
    if data.ndim == 2:
        data = data.mean(axis=1)
    return data.astype(np.float64)


def normalize(x: np.ndarray, peak: float = 0.85) -> np.ndarray:
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


def write(name: str, x: np.ndarray, peak: float = 0.85) -> None:
    sf.write(f'{OUT}/{name}.wav', normalize(x, peak), SR, subtype='PCM_16')
    print(f'{name}.wav  {len(x) / SR:.2f}s')


def fade_out(x: np.ndarray, ms: float) -> np.ndarray:
    n = int(SR * ms / 1000)
    x = x.copy()
    x[-n:] *= np.linspace(1, 0, n)
    return x


try:
    # --- そのまま変換する素材 ---
    write('tap', load_mono('interface-sounds/**/click_001.ogg'))
    write('explosion', load_mono('sci-fi-sounds/**/explosionCrunch_002.ogg'))
    write('reveal', load_mono('digital-audio/**/powerUp1.ogg'))
    write('event', load_mono('digital-audio/**/phaserUp1.ogg'))

    # --- spin: 3.5秒・cubic-out で減速するルーレットのチック音 ---
    # use-digit-roulette.ts の withTiming(duration=3500, Easing.out(cubic)) と同じ
    # 進行曲線 p(t) = 1-(1-t)^3 上で等間隔にセグメント境界を横切る時刻に tick を置く
    SPIN_MS = 3500
    tick = load_mono('interface-sounds/**/click_002.ogg')
    n_ticks = 44  # 盤面のセグメント通過回数ぶんの目安
    spin = np.zeros(int(SR * SPIN_MS / 1000) + len(tick))
    for k in range(n_ticks):
        p = (k + 0.5) / n_ticks           # 等間隔の進行度
        t = 1 - (1 - p) ** (1 / 3)        # cubic-out の逆関数で時刻へ
        start = int(t * SR * SPIN_MS / 1000)
        gain = 0.6 + 0.4 * (k / n_ticks)  # 終盤ほどわずかに強調
        spin[start:start + len(tick)] += tick * gain
    write('spin', spin[:int(SR * SPIN_MS / 1000)])
except IndexError:
    print('Kenney素材（interface-sounds / sci-fi-sounds / digital-audio）が'
          '見つからないため tap/explosion/reveal/event/spin の生成をスキップします')

# --- drumroll: 2.0秒のスネアロール (フィルタードノイズ合成) ---
# use-drumroll.ts の durationMs=2000 に合わせる。クレッシェンドで「ダラダラ…」感を出す
DRUM_MS = 2000
rng = np.random.default_rng(42)
roll = np.zeros(int(SR * DRUM_MS / 1000))
hit_len = int(SR * 0.045)
t_hit = np.arange(hit_len) / SR
env = np.exp(-t_hit * 90)  # 短い減衰
interval = 0.028  # 約36打/秒のロール
n_hits = int(DRUM_MS / 1000 / interval)
for k in range(n_hits):
    start = int(k * interval * SR)
    if start + hit_len > len(roll):
        break
    noise = rng.standard_normal(hit_len)
    # 簡易バンドパス: 差分(ハイパス)→移動平均(ローパス)でスネア帯域に寄せる
    noise = np.diff(noise, prepend=0)
    noise = np.convolve(noise, np.ones(6) / 6, mode='same')
    body = 0.35 * np.sin(2 * np.pi * 180 * t_hit) * np.exp(-t_hit * 60)  # 胴鳴り
    gain = (0.5 + 0.5 * (k / n_hits)) * (0.9 + 0.2 * rng.random())  # クレッシェンド+揺らぎ
    roll[start:start + hit_len] += (noise * env + body) * gain
write('drumroll', fade_out(roll, 60))

# --- heartbeat: 「ドクッ」1拍ぶんの心音（lub-dub）約 0.25秒 ---
# 爆弾スワイプのスコアに応じて bomb-swipe-game.tsx 側が
# playSound('heartbeat') の呼び出し間隔を詰めることでテンポを演出するため、
# 素材自体はループさせず単発の1拍でよい
LUB_MS, GAP_MS, DUB_MS = 90, 60, 70


def decayed_sine(freq: float, ms: float) -> np.ndarray:
    n = int(SR * ms / 1000)
    t = np.arange(n) / SR
    env = np.exp(-t * (4.0 / (ms / 1000)))  # 拍の終わりでほぼ減衰しきる指数減衰
    return np.sin(2 * np.pi * freq * t) * env


lub = decayed_sine(55, LUB_MS)
gap = np.zeros(int(SR * GAP_MS / 1000))
dub = decayed_sine(45, DUB_MS) * 0.7  # dub は lub より弱く
heartbeat = np.concatenate([lub, gap, dub])
write('heartbeat', heartbeat, peak=10 ** (-3 / 20))  # ピーク -3dBFS
