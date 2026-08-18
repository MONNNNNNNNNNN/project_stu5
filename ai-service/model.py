"""
The bone-age network, reconstructed from the handed-over checkpoint.

The checkpoint is a bare `state_dict`, so the architecture has to be declared here in order to
load it. It arrived undocumented — this definition was derived from the tensor shapes and then
verified: `load_state_dict(..., strict=True)` reports **0 missing and 0 unexpected keys**, so
this is the exact network the weights were trained in, not an approximation of it.

The giveaway is `regressor.0.weight` at shape (128, 1281). EfficientNet-B0 pools to 1280
features; the extra column is the sex scalar concatenated on. Hence the two-argument forward.

Used only for the one-off ONNX conversion in `convert_to_onnx.py`. The deployed service runs
ONNX Runtime and never imports torch — see that file for why.
"""

import torch
import torch.nn as nn
import torchvision


class BoneAgeModel(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        backbone = torchvision.models.efficientnet_b0(weights=None)
        # Classifier was stripped during training: the checkpoint carries no
        # backbone.classifier.* keys, only backbone.features.* and the regressor.
        backbone.classifier = nn.Identity()
        self.backbone = backbone
        self.regressor = nn.Sequential(
            nn.Linear(1281, 128),  # 1280 pooled image features + 1 sex scalar
            nn.ReLU(),
            nn.Linear(128, 1),
        )

    def forward(self, image: torch.Tensor, sex: torch.Tensor) -> torch.Tensor:
        features = self.backbone(image)
        return self.regressor(torch.cat([features, sex], dim=1))
