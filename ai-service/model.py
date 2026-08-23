"""
The bone-age network — matches `src/model.py` in the training repo exactly (EfficientNet-B3
as of refine5; the model shipped through refine4 was B0, see git history for that version).

The giveaway is `regressor.0.weight` at shape (128, in_features + 1): the backbone's pooled
feature vector (1536 for B3) with the sex scalar concatenated on. Hence the two-argument
forward. `in_features` is read off the backbone at init time rather than hardcoded, so this
file tracks whichever EfficientNet variant the checkpoint was actually trained with.

Used only for the one-off ONNX conversion in `convert_to_onnx.py`. The deployed service runs
ONNX Runtime and never imports torch — see that file for why.
"""

import torch
import torch.nn as nn
import torchvision


class BoneAgeModel(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        backbone = torchvision.models.efficientnet_b3(weights=None)
        in_features = backbone.classifier[1].in_features
        # Classifier was stripped during training: the checkpoint carries no
        # backbone.classifier.* weights, only backbone.features.* and the regressor.
        backbone.classifier[1] = nn.Identity()
        self.backbone = backbone
        self.regressor = nn.Sequential(
            nn.Linear(in_features + 1, 128),  # pooled image features + 1 sex scalar
            nn.ReLU(),
            nn.Linear(128, 1),
        )

    def forward(self, image: torch.Tensor, sex: torch.Tensor) -> torch.Tensor:
        features = self.backbone(image)
        return self.regressor(torch.cat([features, sex], dim=1))
