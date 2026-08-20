from __future__ import annotations

import subprocess
from pathlib import Path


PROJECT = Path(r"E:\projects\professionalresume")
AD_DIR = PROJECT / "marketing" / "tiktok-ads"
VOICE_DIR = AD_DIR / "voiceover"
AUDIO_DIR = AD_DIR / "audio"
FFMPEG = Path(r"C:\projects\ffmpeg-7.1.1\bin\ffmpeg.exe")
FFPROBE = Path(r"C:\projects\ffmpeg-7.1.1\bin\ffprobe.exe")
CSCRIPT = "cscript.exe"
SAPI_SCRIPT = Path(r"C:\tmp\professionalresume_sapi_speak.vbs")


VBS = r'''
Option Explicit
Dim outPath, speechText, stream, speaker, voices, voice, selected
outPath = WScript.Arguments.Item(0)
speechText = WScript.Arguments.Item(1)

Set stream = CreateObject("SAPI.SpFileStream")
stream.Open outPath, 3, True

Set speaker = CreateObject("SAPI.SpVoice")
Set voices = speaker.GetVoices
selected = False

For Each voice In voices
  On Error Resume Next
  If LCase(voice.GetAttribute("Gender")) = "female" Then
    Set speaker.Voice = voice
    selected = True
    Exit For
  End If
  On Error GoTo 0
Next

If Not selected Then
  For Each voice In voices
    If InStr(LCase(voice.GetDescription), "zira") > 0 Then
      Set speaker.Voice = voice
      Exit For
    End If
  Next
End If

speaker.Rate = 2
speaker.Volume = 100
Set speaker.AudioOutputStream = stream
speaker.Speak speechText
stream.Close
'''


ADS = [
    {
        "slug": "cv_builder",
        "video": "professionalresume_tiktok_ad_01_cv_builder.mp4",
        "output": "professionalresume_tiktok_ad_01_cv_builder_voiceover.mp4",
        "text": (
            "Still applying with an old CV? Build a Kenya ready professional CV in minutes. "
            "Choose a clean template, improve your bullet points with AI, and export a polished PDF. "
            "Built for banks, NGOs, SACCOs, county roles, U N agencies, and global employers. "
            "Start today at professionalresume dot co dot ke."
        ),
    },
    {
        "slug": "ats_checker",
        "video": "professionalresume_tiktok_ad_02_ats_checker.mp4",
        "output": "professionalresume_tiktok_ad_02_ats_checker_voiceover.mp4",
        "text": (
            "Before you send that application, check your CV. Upload your CV, paste the job advert, "
            "and get your ATS score with clear fixes. Find missing keywords, clean your format, "
            "and apply with more confidence. Check your ATS score at professionalresume dot co dot ke."
        ),
    },
    {
        "slug": "mpesa_cover_letter",
        "video": "professionalresume_tiktok_ad_03_mpesa_cover_letter.mp4",
        "output": "professionalresume_tiktok_ad_03_mpesa_cover_letter_voiceover.mp4",
        "text": (
            "One application deserves better documents. Create your resume and a role specific cover letter. "
            "When you are ready to export, unlock your document with M Pesa for only Kenya shillings one hundred per month. "
            "Build it, pay safely, and apply with confidence."
        ),
    },
]


def run(cmd: list[str]) -> str:
    result = subprocess.run(cmd, check=True, text=True, capture_output=True)
    return result.stdout.strip()


def duration(path: Path) -> float:
    out = run([str(FFPROBE), "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)])
    return float(out)


def make_voice(text: str, path: Path) -> None:
    SAPI_SCRIPT.parent.mkdir(parents=True, exist_ok=True)
    SAPI_SCRIPT.write_text(VBS, encoding="utf-8")
    run([CSCRIPT, "//NoLogo", str(SAPI_SCRIPT), str(path), text])


def mix_voice(slug: str, voice_path: Path) -> Path:
    mixed = VOICE_DIR / f"{slug}_narration_mix.wav"
    voice_duration = duration(voice_path)
    target_voice_duration = 18.8
    atempo = max(1.0, min(1.35, voice_duration / target_voice_duration))
    voice_filter = f"volume=1.55,atempo={atempo:.3f},adelay=350|350,apad,atrim=0:20"
    music = AUDIO_DIR / "professionalresume_20s_marketing_bed.wav"
    filter_graph = f"[0:a]volume=0.11,atrim=0:20[a0];[1:a]{voice_filter}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.92[a]"
    run([str(FFMPEG), "-y", "-i", str(music), "-i", str(voice_path), "-filter_complex", filter_graph, "-map", "[a]", "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", str(mixed)])
    return mixed


def mux(video: Path, audio: Path, output: Path) -> None:
    run([
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
    ])


def main() -> None:
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    for ad in ADS:
        voice = VOICE_DIR / f"{ad['slug']}_female_voice.wav"
        make_voice(ad["text"], voice)
        mixed = mix_voice(ad["slug"], voice)
        out = AD_DIR / ad["output"]
        mux(AD_DIR / ad["video"], mixed, out)
        print(out)


if __name__ == "__main__":
    main()
