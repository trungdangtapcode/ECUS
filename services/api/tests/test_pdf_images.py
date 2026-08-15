"""Real synthetic page rendering respects provider capability and image limits."""

import io

import pytest
from PIL import Image
from test_review import pdf_bytes

from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError
from ecus_api.storage.pdf_images import page_images


def test_bounded_images_are_real_jpegs_and_rendering_is_repeatable(settings: Settings) -> None:
    content = pdf_bytes(["Synthetic cargo", "Net weight 123"])
    images = page_images(content, [1], {}, settings)
    assert len(images) == 1 and images[0].mime_type == "image/jpeg"
    with Image.open(io.BytesIO(images[0].data)) as image:
        assert image.format == "JPEG" and image.width > 0 and image.height > 0
    assert page_images(content, [1], {}, settings)[0].data == images[0].data


def test_image_capability_and_budgets_are_enforced(settings: Settings) -> None:
    content = pdf_bytes(["Synthetic cargo"])
    settings.ai_supports_vision = False
    with pytest.raises(AppError) as unsupported:
        page_images(content, [1], {}, settings)
    assert unsupported.value.code == "ai_vision_unsupported"
    settings.ai_supports_vision = True
    settings.ai_max_images = 1
    with pytest.raises(AppError) as count:
        page_images(content, [1, 2], {}, settings)
    assert count.value.code == "ai_input_too_large"
    settings.ai_max_image_bytes = 1
    with pytest.raises(AppError) as size:
        page_images(content, [1], {}, settings)
    assert size.value.code == "ai_input_too_large"
