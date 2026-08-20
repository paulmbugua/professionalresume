from __future__ import annotations

import subprocess
from pathlib import Path


PROJECT = Path(r"E:\projects\professionalresume")
AD_DIR = PROJECT / "marketing" / "tiktok-ads"
VOICE_DIR = AD_DIR / "voiceover"
AUDIO_DIR = AD_DIR / "audio"
FFMPEG = Path(r"C:\projects\ffmpeg-7.1.1\bin\ffmpeg.exe")
FFPROBE = Path(r"C:\projects\ffmpeg-7.1.1\bin\ffprobe.exe")
SAPI_SCRIPT = Path(r"C:\tmp\professionalresume_kenyan_sapi.vbs")

VBS = r'''
Option Explicit
Dim outPath, textPath, speechText, stream, speaker, voices, voice, file, selected
outPath = WScript.Arguments.Item(0)
textPath = WScript.Arguments.Item(1)

Set file = CreateObject("Scripting.FileSystemObject").OpenTextFile(textPath, 1, False, -1)
speechText = file.ReadAll
file.Close

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

speaker.Rate = 0
speaker.Volume = 100
Set speaker.AudioOutputStream = stream
speaker.Speak speechText
stream.Close
'''

ADS = [
    {
        "slug": "cv_builder_kenyan",
        "video": "professionalresume_tiktok_ad_01_cv_builder.mp4",
        "output": "professionalresume_tiktok_ad_01_cv_builder_kenyan_voiceover.mp4",
        "text": (
            "Hi, still sending the same old CV? Let's fix that. "
            "On Professional Resume dot co dot ke, build a clean Kenya ready CV in minutes. "
            "Choose a modern template, improve your bullet points with AI, then export a polished PDF "
            "for banks, NGOs, SACCOs, county roles, U N agencies, and global employers."
        ),
    },
    {
        "slug": "ats_checker_kenyan",
        "video": "professionalresume_tiktok_ad_02_ats_checker.mp4",
        "output": "professionalresume_tiktok_ad_02_ats_checker_kenyan_voiceover.mp4",
        "text": (
            "Before you press apply, take a minute and check your CV. "
            "Upload it on Professional Resume dot co dot ke, paste the job advert, and get your ATS score. "
            "You will see missing keywords, format issues, and simple fixes before sending your application."
        ),
    },
    {
        "slug": "mpesa_cover_letter_kenyan",
        "video": "professionalresume_tiktok_ad_03_mpesa_cover_letter.mp4",
        "output": "professionalresume_tiktok_ad_03_mpesa_cover_letter_kenyan_voiceover.mp4",
        "text": (
            "Your CV and cover letter should match the job, not sound copied. "
            "Create both on Professional Resume dot co dot ke, then unlock export with M Pesa. "
            "It is only Kenya shillings one hundred per month. "
            "Build it, pay safely, and apply with confidence."
        ),
    },
]


def run(cmd: list[str]) -> str:
    result = subprocess.run(cmd, check=True, text=True, capture_output=True)
    return result.stdout.strip()


def media_duration(path: Path) -> float:
    return float(run([str(FFPROBE), "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)]))


def make_voice(text: str, slug: str) -> Path:
    SAPI_SCRIPT.parent.mkdir(parents=True, exist_ok=True)
    SAPI_SCRIPT.write_text(VBS, encoding="utf-8")
    text_path = VOICE_DIR / f"{slug}.txt"
    voice_path = VOICE_DIR / f"{slug}_female_voice.wav"
    text_path.write_text(text, encoding="utf-16")
    run(["cscript.exe", "//NoLogo", str(SAPI_SCRIPT), str(voice_path), str(text_path)])
    return voice_path


def mix(slug: str, voice: Path) -> Path:
    mixed = VOICE_DIR / f"{slug}_narration_mix.wav"
    voice_duration = media_duration(voice)
    # Keep the delivery relaxed, but fit it inside the 20 second cut.
    atempo = max(1.0, min(1.24, voice_duration / 18.4))
    music = AUDIO_DIR / "professionalresume_20s_marketing_bed.wav"
    voice_chain = (
        f"volume=1.65,atempo={atempo:.3f},"
        "highpass=f=90,lowpass=f=9000,"
        "acompressor=threshold=-18dB:ratio=2.6:attack=12:release=180,"
        "adelay=420|420,apad,atrim=0:20"
    )
    graph = (
        "[0:a]volume=0.075,atrim=0:20[a0];"
        f"[1:a]{voice_chain}[a1];"
        "[a0][a1]amix=inputs=2:duration=first:dropout_transition=0,"
        "alimiter=limit=0.92[a]"
    )
    run([str(FFMPEG), "-y", "-i", str(music), "-i", str(voice), "-filter_complex", graph, "-map", "[a]", "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", str(mixed)])
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
        voice = make_voice(ad["text"], ad["slug"])
        mixed = mix(ad["slug"], voice)
        output = AD_DIR / ad["output"]
        mux(AD_DIR / ad["video"], mixed, output)
        print(output)


if __name__ == "__main__":
    main()

