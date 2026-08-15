"""Local OCR adapter. Originals never leave storage or change during recognition."""

import asyncio
import csv
import io
import threading
from pathlib import Path
from tempfile import TemporaryDirectory

import pypdfium2 as pdfium  # type: ignore[import-untyped]
from PIL import Image

from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError
from ecus_api.modules.review.schemas import OCRPage, OCRWord

# PDFium is not thread-safe; serialize native rendering, not AI or OCR subprocesses.
_render_lock = threading.Lock()


def render(
    content: bytes, page: int, path: Path, rotation: int, settings: Settings
) -> tuple[int, int]:
    with _render_lock, pdfium.PdfDocument(content) as document:
        source = document[page - 1]
        try:
            width, height = source.get_size()
            scale = min(settings.ocr_dpi / 72, (settings.ocr_max_pixels / (width * height)) ** 0.5)
            bitmap = source.render(scale=scale, rotation=rotation)
            try:
                image = bitmap.to_pil()
                image.save(path)
                size: tuple[int, int] = image.size
                image.close()
                return size
            finally:
                bitmap.close()
        finally:
            source.close()


def parse_tsv(body: str, width: int, height: int, rotation: int = 0) -> OCRPage:
    words: list[OCRWord] = []
    text = ""
    previous: tuple[str, ...] | None = None
    for row in csv.DictReader(io.StringIO(body), delimiter="\t", quoting=csv.QUOTE_NONE):
        if row.get("level") != "5" or not row.get("text", "").strip():
            continue
        line = tuple(row[key] for key in ("block_num", "par_num", "line_num"))
        if text:
            text += " " if line == previous else "\n"
        value = row["text"].strip()
        left, top, w, h = (float(row[key]) for key in ("left", "top", "width", "height"))
        words.append(
            OCRWord(
                text=value,
                offset=len(text),
                confidence=max(0, min(1, float(row["conf"]) / 100)),
                box=[left / width, top / height, (left + w) / width, (top + h) / height],
            )
        )
        text += value
        previous = line
    return OCRPage(
        text=text,
        words=words,
        rotation=rotation,
        confidence=sum(word.confidence for word in words) / len(words) if words else 0,
    )


async def recognize(content: bytes, page: int, settings: Settings) -> OCRPage:
    if not settings.ocr_enabled:
        raise AppError("ocr_disabled", "Local OCR is disabled in environment configuration.", 503)
    candidates: list[OCRPage] = []
    with TemporaryDirectory(prefix="ecus-ocr-") as folder:
        path = Path(folder) / "page.png"
        for rotation in (0, 90, 180, 270):
            size = await asyncio.to_thread(render, content, page, path, rotation, settings)
            if rotation == 0:
                # Only an entirely white rendering is blank; faint marks still require OCR.
                with Image.open(path) as image, image.convert("RGB") as rgb:
                    if rgb.getextrema() == ((255, 255), (255, 255), (255, 255)):
                        return OCRPage(text="", words=[], confidence=1, is_blank=True)
            try:
                process = await asyncio.create_subprocess_exec(
                    settings.ocr_command,
                    str(path),
                    "stdout",
                    "-l",
                    settings.ocr_languages,
                    "--psm",
                    "3",
                    "tsv",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.DEVNULL,
                )
            except FileNotFoundError:
                raise AppError(
                    "ocr_unavailable", "Install the configured OCR executable.", 503
                ) from None
            try:
                async with asyncio.timeout(settings.ocr_timeout_seconds):
                    output, _ = await process.communicate()
            except TimeoutError:
                raise AppError("ocr_timeout", "OCR timed out for this page.", 503) from None
            finally:
                if process.returncode is None:
                    process.kill()
                    await process.wait()
            if process.returncode != 0:
                raise AppError("ocr_failed", "OCR failed for this page.", 422)
            recognized = parse_tsv(output.decode("utf-8", errors="replace"), *size, rotation)
            candidates.append(recognized)
            if len(recognized.words) >= 4 and recognized.confidence >= settings.ocr_min_confidence:
                break
    return max(candidates, key=lambda item: item.confidence * min(len(item.words), 20))
