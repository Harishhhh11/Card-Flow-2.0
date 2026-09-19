import time
from typing import Optional

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException
)

from app.services.gemini_service import extract_card_details
from app.services.image_optimizer import optimize_image


router = APIRouter(
    prefix="/api",
    tags=["Visiting Card Scanner"]
)


ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
]


def validate_image(
    file: UploadFile,
    field_name: str
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{field_name} must be "
                "JPG, PNG or WEBP."
            )
        )


@router.post("/scan-card")
async def scan_card(

    # Side 1 is REQUIRED
    side1: UploadFile = File(...),

    # Side 2 is OPTIONAL
    side2: Optional[UploadFile] = File(None)
):

    start_time = time.time()

    try:

        # -----------------------------
        # VALIDATE SIDE 1
        # -----------------------------

        validate_image(
            side1,
            "Side 1"
        )

        # -----------------------------
        # VALIDATE SIDE 2
        # -----------------------------

        if side2:
            validate_image(
                side2,
                "Side 2"
            )

        # -----------------------------
        # READ SIDE 1
        # -----------------------------

        side1_original_bytes = await side1.read()

        if not side1_original_bytes:
            raise HTTPException(
                status_code=400,
                detail="Side 1 image is empty."
            )

        original_side1_size = len(
            side1_original_bytes
        ) / 1024 / 1024

        print(
            f"SIDE 1 ORIGINAL SIZE: "
            f"{original_side1_size:.2f} MB"
        )

        # -----------------------------
        # OPTIMIZE SIDE 1
        # -----------------------------

        side1_bytes = optimize_image(
            side1_original_bytes,
            max_size=1200,
            quality=80
        )

        optimized_side1_size = len(
            side1_bytes
        ) / 1024 / 1024

        print(
            f"SIDE 1 OPTIMIZED SIZE: "
            f"{optimized_side1_size:.2f} MB"
        )

        # Optimized image is JPEG
        side1_mime_type = "image/jpeg"

        print(
            f"IMAGE PROCESSING TIME: "
            f"{time.time() - start_time:.2f}s"
        )

        # -----------------------------
        # SIDE 2 DEFAULT VALUES
        # -----------------------------

        side2_bytes = None
        side2_mime_type = None

        # -----------------------------
        # READ + OPTIMIZE SIDE 2
        # -----------------------------

        if side2:

            side2_original_bytes = await side2.read()

            if not side2_original_bytes:
                raise HTTPException(
                    status_code=400,
                    detail="Side 2 image is empty."
                )

            original_side2_size = len(
                side2_original_bytes
            ) / 1024 / 1024

            print(
                f"SIDE 2 ORIGINAL SIZE: "
                f"{original_side2_size:.2f} MB"
            )

            side2_bytes = optimize_image(
                side2_original_bytes,
                max_size=1200,
                quality=80
            )

            optimized_side2_size = len(
                side2_bytes
            ) / 1024 / 1024

            print(
                f"SIDE 2 OPTIMIZED SIZE: "
                f"{optimized_side2_size:.2f} MB"
            )

            # Optimized image is JPEG
            side2_mime_type = "image/jpeg"

        print(
            f"TOTAL IMAGE PREPARATION TIME: "
            f"{time.time() - start_time:.2f}s"
        )

        # -----------------------------
        # SEND TO GEMINI
        # -----------------------------

        print(
            "SENDING IMAGE TO GEMINI..."
        )

        gemini_start_time = time.time()

        contact = extract_card_details(
            side1_bytes=side1_bytes,
            side1_mime_type=side1_mime_type,
            side2_bytes=side2_bytes,
            side2_mime_type=side2_mime_type
        )

        gemini_time = (
            time.time() -
            gemini_start_time
        )

        print(
            f"GEMINI EXTRACTION TIME: "
            f"{gemini_time:.2f}s"
        )

        total_time = (
            time.time() -
            start_time
        )

        print(
            f"TOTAL SCAN TIME: "
            f"{total_time:.2f}s"
        )

        # -----------------------------
        # RETURN RESULT
        # -----------------------------

        return {
            "success": True,
            "message": (
                "Visiting card scanned successfully"
            ),
            "side2_used": side2 is not None,
            "data": contact.model_dump()
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "SCAN ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to scan visiting card: "
                f"{str(e)}"
            )
        )