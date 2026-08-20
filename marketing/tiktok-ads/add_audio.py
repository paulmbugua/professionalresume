from __future__ import annotations

import math
import random
import struct
import subprocess
import wave
from pathlib import Path


PROJECT = Path(r"E:\projects\professionalresume")
AD_DIR = PROJECT / "marketing" / "tiktok-ads"
AUDIO_DIR = AD_DIR / "audio"
FFMPEG = Path(r"C:\projects\ffmpeg-7.1.1\bin\ffmpeg.exe")

SR = 44100
DURATION = 20.0
N = int(SR * DURATION)


def env_adsr(t: float, dur: float, attack=0.01, decay=0.08, sustain=0.55, release=0.15) -> float:
    if t < 0 or t > dur:
        return 0.0
    if t < attack:
        return t / attack
    if t < attack + decay:
        return 1 - (1 - sustain) * ((t - attack) / decay)
    if t > dur - release:
        return max(0.0, sustain * ((dur - t) / release))
    return sustain


def add_tone(buf: list[float], start: float, dur: float, freq: float, amp: float, wave_name="sine"):
    start_i = max(0, int(start * SR))
    end_i = min(N, int((start + dur) * SR))
    for i in range(start_i, end_i):
        t = (i - start_i) / SR
        phase = 2 * math.pi * freq * t
        if wave_name == "tri":
            val = 2 / math.pi * math.asin(math.sin(phase))
        elif wave_name == "square":
            val = 1.0 if math.sin(phase) >= 0 else -1.0
        else:
            val = math.sin(phase)
        buf[i] += val * amp * env_adsr(t, dur)


def add_kick(buf: list[float], start: float):
    start_i = int(start * SR)
    dur = 0.18
    for i in range(start_i, min(N, start_i + int(dur * SR))):
        t = (i - start_i) / SR
        freq = 92 - 54 * (t / dur)
        val = math.sin(2 * math.pi * freq * t) * math.exp(-22 * t)
        buf[i] += val * 0.95


def add_hat(buf: list[float], start: float, amp=0.13):
    rng = random.Random(int(start * 1000))
    start_i = int(start * SR)
    dur = 0.055
    for i in range(start_i, min(N, start_i + int(dur * SR))):
        t = (i - start_i) / SR
        noise = rng.uniform(-1, 1)
        buf[i] += noise * amp * math.exp(-70 * t)


def add_snare(buf: list[float], start: float):
    rng = random.Random(8000 + int(start * 1000))
    start_i = int(start * SR)
    dur = 0.16
    for i in range(start_i, min(N, start_i + int(dur * SR))):
        t = (i - start_i) / SR
        tone = math.sin(2 * math.pi * 185 * t) * 0.25
        noise = rng.uniform(-1, 1) * 0.65
        buf[i] += (tone + noise) * math.exp(-24 * t)


def add_riser(buf: list[float], start: float, dur: float):
    start_i = int(start * SR)
    end_i = min(N, start_i + int(dur * SR))
    for i in range(start_i, end_i):
        t = (i - start_i) / SR
        p = t / dur
        freq = 520 + 620 * p
        val = math.sin(2 * math.pi * freq * t) * (p ** 1.7)
        buf[i] += val * 0.16


def build_audio(path: Path):
    buf = [0.0] * N
    bpm = 118
    beat = 60 / bpm

    # Percussion: restrained, punchy, ad-friendly.
    t = 0.0
    beat_index = 0
    while t < DURATION:
        if beat_index % 4 in (0, 2):
            add_kick(buf, t)
        if beat_index % 4 == 2:
            add_snare(buf, t)
        add_hat(buf, t)
        add_hat(buf, t + beat / 2, 0.08)
        t += beat
        beat_index += 1

    # Warm bass and clean plucks.
    progression = [110.0, 146.83, 130.81, 98.0]
    for bar in range(10):
        root = progression[bar % len(progression)]
        start = bar * 2.0
        add_tone(buf, start, 1.85, root, 0.25, "sine")
        for step in [0.0, 0.5, 1.0, 1.5]:
            add_tone(buf, start + step, 0.28, root * 2, 0.11, "tri")
            add_tone(buf, start + step + 0.18, 0.22, root * 2.5, 0.07, "tri")

    # Corporate shimmer chords.
    chords = [
        [220.0, 261.63, 329.63],
        [293.66, 349.23, 440.0],
        [261.63, 329.63, 392.0],
        [196.0, 246.94, 293.66],
    ]
    for bar in range(10):
        start = bar * 2.0
        for freq in chords[bar % len(chords)]:
            add_tone(buf, start, 1.9, freq, 0.055, "sine")

    for start in [4.2, 7.0, 11.8, 14.8]:
        add_riser(buf, start, 0.65)

    # Normalize and write stereo WAV.
    peak = max(0.001, max(abs(v) for v in buf))
    gain = 0.86 / peak
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        for v in buf:
            sample = int(max(-1.0, min(1.0, v * gain)) * 32767)
            wav.writeframes(struct.pack("<hh", sample, sample))


def mux(video: Path, audio: Path, output: Path):
    subprocess.run(
        [
            str(FFMPEG),
            "-y",
            "-i",
            str(video),
            "-i",
            str(audio),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(output),
        ],
        check=True,
    )


def main():
    audio = AUDIO_DIR / "professionalresume_20s_marketing_bed.wav"
    build_audio(audio)
    videos = [
        "professionalresume_tiktok_ad_01_cv_builder.mp4",
        "professionalresume_tiktok_ad_02_ats_checker.mp4",
        "professionalresume_tiktok_ad_03_mpesa_cover_letter.mp4",
    ]
    for name in videos:
        source = AD_DIR / name
        target = AD_DIR / name.replace(".mp4", "_with_audio.mp4")
        mux(source, audio, target)
        print(target)


if __name__ == "__main__":
    main()
