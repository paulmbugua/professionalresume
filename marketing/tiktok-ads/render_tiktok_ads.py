from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

PROJECT = Path(r"E:\projects\professionalresume")
OUT_DIR = PROJECT / "marketing" / "tiktok-ads"
BG_DIR = OUT_DIR / "backgrounds"
FRAME_DIR = OUT_DIR / "_frames"
FFMPEG = Path(r"C:\projects\ffmpeg-7.1.1\bin\ffmpeg.exe")
FONT_REG = r"C\:/Windows/Fonts/segoeui.ttf"
FONT_BOLD = r"C\:/Windows/Fonts/segoeuib.ttf"
LOGO = PROJECT / "apps" / "web" / "public" / "assets" / "logo.png"
SOURCES = [
    Path(r"C:\Users\Mbugua\.codex\generated_images\019f4af9-c266-7780-a821-7bcfe59d3a12\call_GIwv7fpMRXi6tf7WqJAmg58q.png"),
    Path(r"C:\Users\Mbugua\.codex\generated_images\019f4af9-c266-7780-a821-7bcfe59d3a12\call_gXqQ4MEceQZd6kzQo9jgQnKy.png"),
    Path(r"C:\Users\Mbugua\.codex\generated_images\019f4af9-c266-7780-a821-7bcfe59d3a12\call_roVqRBiXdo6gGTonPVLIzIE5.png"),
]


def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'").replace("%", "\\%")


def dt(text: str, x: int, y: int, size: int, color: str = "white", font: str = FONT_BOLD, enable: str | None = None) -> str:
    part = f"drawtext=fontfile='{font}':text='{esc(text)}':x={x}:y={y}:fontsize={size}:fontcolor={color}:line_spacing=8"
    if enable:
        part += f":enable='{enable}'"
    return part


def box(x: int, y: int, w: int, h: int, color: str, enable: str | None = None) -> str:
    part = f"drawbox=x={x}:y={y}:w={w}:h={h}:color={color}:t=fill"
    if enable:
        part += f":enable='{enable}'"
    return part


def make_filter(ad: dict) -> str:
    e1, e2, e3, e4 = "between(t,0,7.1)", "between(t,4.3,13.9)", "between(t,7,17.5)", "between(t,12,20)"
    parts = [
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=rgba",
        box(0, 0, 1080, 1920, "black@0.34"),
        box(0, 0, 1080, 570, ad["top_shade"]),
        box(0, 1280, 1080, 640, ad["bottom_shade"]),
        box(760, 0, 320, 450, ad["accent_soft"]),
        dt("ProfessionalResume.co.ke", 164, 65, 34, "white", FONT_BOLD),
        dt("Built for Kenyan job seekers", 164, 111, 25, "0xDDEBFF", FONT_REG),
        dt(ad["hook"], 58, 224, 38, "0x93C5FD", FONT_BOLD, e1),
        dt(ad["headline_1"], 58, 292, 76, "white", FONT_BOLD, e1),
        dt(ad["headline_2"], 58, 382, 76, "white", FONT_BOLD, e1),
        dt(ad["support_1"], 60, 512, 36, "0xE2E8F0", FONT_REG, e1),
        dt(ad["support_2"], 60, 560, 36, "0xE2E8F0", FONT_REG, e1),
    ]
    y = 620
    for chip in ad["chips"]:
        parts.extend([box(58, y, 590, 68, ad["accent"], e2), dt(chip, 86, y + 14, 32, "white", FONT_BOLD, e2)])
        y += 88
    if ad["visual"] == "resume":
        parts.extend([
            box(606, 808, 386, 532, "white@0.92", e3),
            box(642, 848, 82, 82, "0x0052CC@0.92", e3),
            dt("CV", 660, 869, 30, "white", FONT_BOLD, e3),
            box(752, 858, 184, 10, "0x1F2937@0.85", e3),
            box(752, 892, 220, 10, "0x64748B@0.72", e3),
            box(640, 992, 300, 12, "0x0052CC@0.75", e3),
            box(640, 1040, 260, 9, "0x64748B@0.60", e3),
            box(640, 1090, 300, 12, "0x0052CC@0.75", e3),
            box(640, 1138, 250, 9, "0x64748B@0.60", e3),
            box(640, 1190, 300, 12, "0x0052CC@0.75", e3),
            box(640, 1238, 270, 9, "0x64748B@0.60", e3),
        ])
    elif ad["visual"] == "ats":
        parts.extend([
            box(582, 785, 400, 330, "black@0.42", e3),
            dt("92", 700, 840, 118, "white", FONT_BOLD, e3),
            dt("ATS score", 680, 970, 34, "0xD1FAE5", FONT_BOLD, e3),
            box(86, 1090, 914, 260, "white@0.90", e3),
            dt("Keyword match", 132, 1134, 32, "0x0F172A", FONT_BOLD, e3),
            dt("Format scan", 132, 1208, 32, "0x0F172A", FONT_BOLD, e3),
            dt("Job advert fit", 132, 1282, 32, "0x0F172A", FONT_BOLD, e3),
        ])
    else:
        parts.extend([
            box(92, 886, 520, 350, "white@0.92", e3),
            dt("Unlock export", 134, 930, 48, "0x0F172A", FONT_BOLD, e3),
            dt("Resume or cover letter", 134, 1000, 32, "0x475569", FONT_BOLD, e3),
            box(134, 1068, 436, 78, "0x10B981@0.95", e3),
            dt("M-Pesa Ksh 100 monthly", 164, 1086, 31, "white", FONT_BOLD, e3),
            dt("Export after payment", 134, 1175, 29, "0x475569", FONT_REG, e3),
        ])
    parts.extend([
        box(58, 1372, 964, 172, "black@0.66", e4),
        dt(ad["proof_big"], 96, 1398, 72, "white", FONT_BOLD, e4),
        dt(ad["proof_small"], 96, 1483, 34, "0xCBD5E1", FONT_BOLD, e4),
        box(58, 1632, 964, 180, "white@0.92", "between(t,15,20)"),
        dt(ad["cta"], 96, 1665, 50, "0x050F20", FONT_BOLD, "between(t,15,20)"),
        dt(ad["cta_sub"], 96, 1734, 34, "0x0052CC", FONT_BOLD, "between(t,15,20)"),
        "format=yuv420p[v0]",
        "[1:v]format=rgba,scale=86:86:force_original_aspect_ratio=decrease[lg]",
        "[v0][lg]overlay=58:58:format=auto[v]",
    ])
    return ",".join(parts[:-2]) + ";" + ";".join(parts[-2:])


def render(ad: dict):
    out = OUT_DIR / ad["filename"]
    cmd = [
        str(FFMPEG),
        "-y",
        "-loop",
        "1",
        "-t",
        "20",
        "-i",
        str(ad["background"]),
        "-loop",
        "1",
        "-t",
        "20",
        "-i",
        str(LOGO),
        "-filter_complex",
        make_filter(ad),
        "-map",
        "[v]",
        "-t",
        "20",
        "-r",
        "15",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-crf",
        "18",
        str(out),
    ]
    subprocess.run(cmd, check=True)
    print(out)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    BG_DIR.mkdir(parents=True, exist_ok=True)
    if FRAME_DIR.exists():
        shutil.rmtree(FRAME_DIR, ignore_errors=True)
    for idx, src in enumerate(SOURCES, 1):
        if src.exists():
            shutil.copy2(src, BG_DIR / f"ad-{idx:02d}-background.png")
    ads = [
        {"filename": "professionalresume_tiktok_ad_01_cv_builder.mp4", "background": BG_DIR / "ad-01-background.png", "hook": "Still applying with an old CV?", "headline_1": "Build a Kenya-ready", "headline_2": "CV in minutes", "support_1": "Create a polished CV for banks, NGOs,", "support_2": "SACCOs, county roles, UN agencies.", "chips": ["ATS-friendly templates", "AI bullet improvements", "Clean PDF export"], "proof_big": "1,311", "proof_small": "resumes created today", "cta": "Build yours today", "cta_sub": "professionalresume.co.ke", "accent": "0x0052CC@0.88", "accent_soft": "0x0EA5E9@0.30", "top_shade": "0x05101E@0.62", "bottom_shade": "0x030914@0.72", "visual": "resume"},
        {"filename": "professionalresume_tiktok_ad_02_ats_checker.mp4", "background": BG_DIR / "ad-02-background.png", "hook": "Before you apply", "headline_1": "Check your CV for", "headline_2": "ATS filters", "support_1": "Upload your CV, paste the job advert,", "support_2": "then get a clear score and fixes.", "chips": ["ATS score", "Keyword gaps", "Role-specific fixes"], "proof_big": "x2.2", "proof_small": "more interview invitations", "cta": "Check ATS score", "cta_sub": "professionalresume.co.ke/ats-checker", "accent": "0x10B981@0.88", "accent_soft": "0x10B981@0.30", "top_shade": "0x031217@0.64", "bottom_shade": "0x020A12@0.74", "visual": "ats"},
        {"filename": "professionalresume_tiktok_ad_03_mpesa_cover_letter.mp4", "background": BG_DIR / "ad-03-background.png", "hook": "One application. Better documents.", "headline_1": "Resume + cover letter", "headline_2": "that fit the role", "support_1": "Build professional documents, then", "support_2": "unlock export with simple M-Pesa.", "chips": ["Resume builder", "Cover letter builder", "M-Pesa only"], "proof_big": "Ksh 100", "proof_small": "monthly access per builder", "cta": "Export with M-Pesa", "cta_sub": "professionalresume.co.ke", "accent": "0xF97316@0.88", "accent_soft": "0xF97316@0.30", "top_shade": "0x150C07@0.58", "bottom_shade": "0x050A18@0.76", "visual": "payment"},
    ]
    for ad in ads:
        render(ad)


if __name__ == "__main__":
    main()


