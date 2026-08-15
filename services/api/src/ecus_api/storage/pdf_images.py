"""Bounded page images supplement text; they never replace quotation validation."""

import io
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image

from ecus_api.ai.contracts import ImageInput
from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError
from ecus_api.storage.ocr import render


def page_images(
    content: bytes, page_numbers: list[int], rotations: dict[int, int], settings: Settings
) -> tuple[ImageInput, ...]:
    if not settings.ai_supports_vision:
        raise AppError("ai_vision_unsupported", "The configured provider must support images.", 422)
    if not page_numbers or len(page_numbers) > settings.ai_max_images:
        raise AppError("ai_input_too_large", "Too many page images in the extraction batch.", 422)
    rendered = []
    total_bytes = 0
    image_settings = settings.model_copy(update={"ocr_dpi": settings.extraction_image_dpi})
    with TemporaryDirectory(prefix="ecus-evidence-") as folder:
        path = Path(folder) / "page.png"
        for page in page_numbers:
            render(content, page, path, rotations.get(page, 0), image_settings)
            with Image.open(path) as image:
                with image.convert("RGB") as rgb:
                    encoded = io.BytesIO()
                    rgb.save(encoded, format="JPEG", quality=settings.extraction_image_jpeg_quality)
                    data = encoded.getvalue()
            total_bytes += len(data)
            if total_bytes > settings.ai_max_image_bytes:
                raise AppError(
                    "ai_input_too_large", "Page images exceed the configured budget.", 422
                )
            rendered.append(ImageInput(data=data, mime_type="image/jpeg"))
    return tuple(rendered)
