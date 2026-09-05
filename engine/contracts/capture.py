"""Fundus Capture Provider protocol and guidance contracts."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


@dataclass
class DeviceStatus:
    is_connected: bool
    battery_level: float | None = None
    device_model: str = "Generic Fundus Adapter"
    firmware_version: str = "1.0.0"
    sensor_ready: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CaptureGuidance:
    is_ready_to_capture: bool
    alignment_score: float  # 0.0 to 1.0 (centered on macula/disc)
    illumination_score: float  # 0.0 to 1.0
    sharpness_score: float  # 0.0 to 1.0
    field_of_view_score: float  # 0.0 to 1.0
    feedback_messages: list[str] = field(default_factory=list)
    suggested_actions: list[str] = field(default_factory=list)


@runtime_checkable
class FundusCaptureProvider(Protocol):
    """
    Hardware abstraction for smart fundus capture devices.
    Allows smartphone adapters, tabletop cameras, or portable ophthalmic lenses
    to hook into the screening pipeline interchangeably.
    """

    def get_device_status(self) -> DeviceStatus:
        """Query current connection and battery/hardware status."""
        ...

    def provide_capture_guidance(self, frame: Any) -> CaptureGuidance:
        """Real-time optical/alignment feedback on incoming camera frames."""
        ...

    def capture(self, options: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Trigger full-resolution image capture.
        Returns dictionary containing:
          - image_bytes or image_path
          - capture_timestamp
          - exposure_metadata
        """
        ...
