"""
One-off conversion: PyTorch checkpoint -> ONNX. Run locally, once per trained model.

Why the deployed service does not just load the .pt:

    torch          635 MB on disk, 374 MB resident after one inference
    onnxruntime     58 MB on disk, 100 MB resident, ~24 ms per inference

Render's free instance has 512 MB total. FastAPI and Pillow on top of torch does not fit, and
an OOM-killed service is worse than a slow one. The two runtimes agree to 3e-06 on the same
input, so nothing is given up by converting.

    pip install -r requirements-convert.txt
    python convert_to_onnx.py models/best_model_refine5.pth models/bone_age.onnx
"""

import sys
from pathlib import Path

import torch
import torch.nn.functional as F
from PIL import Image

from model import BoneAgeModel

IMG_SIZE = 320  # refine5 (EfficientNet-B3) trains at 320x320, not the earlier B0's 224
MAX_ACCEPTABLE_DRIFT = 1e-4

# Matches src/train.py's IMAGENET_MEAN/STD.
NORM_MEAN = [0.485, 0.456, 0.406]
NORM_STD = [0.229, 0.224, 0.225]

# Shared with backend/scripts/verify-model.mjs — same fixture, same reason: a real hand X-ray
# keeps this check in the input distribution the model was actually trained on.
SAMPLE_IMAGE = Path(__file__).resolve().parents[1] / "backend" / "test" / "fixtures" / "hand.png"


def _sample_input() -> torch.Tensor:
    """
    Real image (grayscale, resized, ImageNet-normalised) if the shared fixture is available,
    else spatially-correlated synthetic noise as a fallback for a standalone checkout.

    Per-pixel white noise, even ImageNet-normalised, is spatially uncorrelated — nothing like
    a real photo — and that alone is enough to send a deep BatchNorm stack (B3's 26 MBConv
    blocks vs B0's 16) into activations in the millions on this checkpoint, which then makes
    the *absolute* torch/onnx drift look huge even though the export itself is fine. Neither
    path runs CLAHE (this only needs to be "image-like", not bit-exact to serving
    preprocessing — that end-to-end check is `npm run verify:model` in the backend).
    """
    mean = torch.tensor(NORM_MEAN).view(1, 3, 1, 1)
    std = torch.tensor(NORM_STD).view(1, 3, 1, 1)

    if SAMPLE_IMAGE.exists():
        img = Image.open(SAMPLE_IMAGE).convert("L").resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)
        arr = torch.frombuffer(bytearray(img.tobytes()), dtype=torch.uint8)
        gray = arr.view(1, 1, IMG_SIZE, IMG_SIZE).float() / 255.0
        rgb = gray.repeat(1, 3, 1, 1)
    else:
        coarse = torch.rand(1, 3, IMG_SIZE // 16, IMG_SIZE // 16)
        rgb = F.interpolate(coarse, size=(IMG_SIZE, IMG_SIZE), mode="bilinear", align_corners=False)

    return (rgb - mean) / std


def main(src: str, dst: str) -> None:
    model = BoneAgeModel()
    # strict=True on purpose: a silently partial load would export a half-random network that
    # still returns plausible-looking numbers.
    model.load_state_dict(torch.load(src, map_location="cpu"), strict=True)
    model.eval()

    dummy_image = _sample_input()
    dummy_sex = torch.tensor([[1.0]])

    torch.onnx.export(
        model,
        (dummy_image, dummy_sex),
        dst,
        input_names=["image", "sex"],
        output_names=["bone_age"],
        dynamic_axes={"image": {0: "batch"}, "sex": {0: "batch"}, "bone_age": {0: "batch"}},
        opset_version=17,
        dynamo=False,
    )

    # Prove the export before trusting it: identical input through both runtimes.
    import onnxruntime as ort

    with torch.no_grad():
        expected = model(dummy_image, dummy_sex).item()
    session = ort.InferenceSession(dst, providers=["CPUExecutionProvider"])
    got = session.run(None, {"image": dummy_image.numpy(), "sex": dummy_sex.numpy()})[0].item()

    drift = abs(expected - got)
    print(f"torch={expected:.6f}  onnx={got:.6f}  drift={drift:.2e}")
    if drift > MAX_ACCEPTABLE_DRIFT:
        raise SystemExit(f"ONNX drifted from torch by {drift:.2e} — do not ship this file.")
    print(f"wrote {dst}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: python convert_to_onnx.py <checkpoint.pt> <out.onnx>")
    main(sys.argv[1], sys.argv[2])
