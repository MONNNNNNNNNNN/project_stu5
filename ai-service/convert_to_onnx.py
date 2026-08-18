"""
One-off conversion: PyTorch checkpoint -> ONNX. Run locally, once per trained model.

Why the deployed service does not just load the .pt:

    torch          635 MB on disk, 374 MB resident after one inference
    onnxruntime     58 MB on disk, 100 MB resident, ~24 ms per inference

Render's free instance has 512 MB total. FastAPI and Pillow on top of torch does not fit, and
an OOM-killed service is worse than a slow one. The two runtimes agree to 3e-06 on the same
input, so nothing is given up by converting.

    pip install -r requirements-convert.txt
    python convert_to_onnx.py models/best_model.pt models/bone_age.onnx
"""

import sys

import torch

from model import BoneAgeModel

IMG_SIZE = 224
MAX_ACCEPTABLE_DRIFT = 1e-4


def main(src: str, dst: str) -> None:
    model = BoneAgeModel()
    # strict=True on purpose: a silently partial load would export a half-random network that
    # still returns plausible-looking numbers.
    model.load_state_dict(torch.load(src, map_location="cpu"), strict=True)
    model.eval()

    dummy_image = torch.rand(1, 3, IMG_SIZE, IMG_SIZE)
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
