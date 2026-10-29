"""Juggling: count touches from the ball's path.

The signal is the ball's vertical position over time. In image coordinates y grows DOWNWARDS, so as the ball falls
y increases, and when a foot/knee/head sends it back up y starts decreasing. A touch is therefore a "turning point at
the bottom": the lowest point between a fall and the next rise.

To ignore jitter, a turning point only counts if the ball then rises by at least `min_rise` pixels (about half a
ball diameter): a hysteresis state machine, the same idea a thermostat uses to avoid flicking on and off.

When the bottom of an arc falls inside a gap (frames where the ball wasn't found), the touch is still counted from
the fall-then-rise around the gap, but it's marked uncertain. The result says how many touches are certain, and
gives a range, instead of pretending to be exact.
"""

from dataclasses import dataclass

import numpy as np

from analysis.tracking import BallPoint


@dataclass
class Touch:
    frame: int
    time: float  # seconds
    x: float
    y: float
    certain: bool  # False when the lowest point fell in a gap in the tracking


@dataclass
class JugglingResult:
    touches: list[Touch]
    fps: float
    hidden_gaps: int = 0  # tracking gaps long enough to hide a touch

    @property
    def count(self) -> int:
        return len(self.touches)

    @property
    def certain(self) -> int:
        return sum(t.certain for t in self.touches)

    @property
    def range(self) -> tuple[int, int]:
        """Plausible range: at the low end only the certain touches; at the high end every counted touch plus one
        for each long tracking gap that wasn't already explained by an inferred touch."""
        unexplained = max(0, self.hidden_gaps - (self.count - self.certain))
        return self.certain, self.count + unexplained

    def summary(self) -> dict:
        return {"touches": self.count, "certain": self.certain, "range": list(self.range),
                "times": [round(t.time, 2) for t in self.touches]}


def _clean_heights(points: list[BallPoint | None], ball: float) -> np.ndarray:
    """Ball y per frame (NaN where unknown). Removes isolated glitches only: a point far from BOTH neighbours
    (more than 1.5 ball diameters from their average). Deliberately NOT a median/average filter: those flatten the
    bottom of each bounce, which is exactly the turning point touches are counted from (found in spike 2b)."""
    y = np.array([p.y if p is not None else np.nan for p in points], dtype=float)
    out = y.copy()
    for i in range(1, len(y) - 1):
        a, b = y[i - 1], y[i + 1]
        if not (np.isnan(a) or np.isnan(b) or np.isnan(y[i])) and abs(y[i] - (a + b) / 2) > 1.5 * ball:
            out[i] = np.nan
    return out


def count_touches(points: list[BallPoint | None], fps: float, min_arc_seconds: float = 0.25) -> JugglingResult:
    sizes = [p.size for p in points if p is not None]
    if not sizes:
        return JugglingResult([], fps)
    ball = float(np.median(sizes))
    y = _clean_heights(points, ball)
    min_rise = ball / 3  # a third of a ball diameter
    min_gap = max(2, int(min_arc_seconds * fps))  # a gap at least this long can hide a whole arc

    touches: list[Touch] = []
    known = [i for i, v in enumerate(y) if not np.isnan(v)]
    if not known:
        return JugglingResult([], fps)

    def add(i: int, certain: bool):
        p = points[i]
        touches.append(Touch(i, i / fps, p.x if p else 0.0, float(y[i]), certain))

    falling = False
    low_i = high_i = known[0]
    prev = known[0]
    for i in known[1:]:
        gap = i - prev - 1
        if falling and gap >= min_gap and y[low_i] - y[i] < min_rise:
            # The ball vanished while low and came back still low: a whole arc happened out of sight, so the
            # low point before the gap was a touch. Counted, but marked uncertain.
            add(low_i, certain=False)
            low_i = i
        prev = i
        if y[i] > y[low_i]:
            low_i = i  # new lowest point (bigger y = lower in the picture)
        if y[i] < y[high_i]:
            high_i = i
        if falling:
            if y[low_i] - y[i] >= min_rise:  # bottomed out and came back up: a touch
                gap_near = np.isnan(y[max(0, low_i - 2):low_i + 3]).any()
                add(low_i, certain=not gap_near)
                falling, high_i = False, i
        elif y[i] - y[high_i] >= min_rise:  # peaked and started falling
            falling, low_i = True, i

    # The first lift: the clip starts with the ball low and its first movement is upwards.
    first = known[0]
    if touches and touches[0].frame > first + 3:
        top = np.nanmin(y[first:touches[0].frame + 1])
        if y[first] - top >= min_rise:
            p = points[first]
            touches.insert(0, Touch(first, first / fps, p.x if p else 0.0, float(y[first]), True))
    touches.sort(key=lambda t: t.frame)
    gaps = _long_gaps(y, min_gap)
    return JugglingResult(touches, fps, hidden_gaps=gaps)


def _long_gaps(y: np.ndarray, min_gap: int) -> int:
    """How many stretches of missing frames are long enough to hide a touch."""
    count = run = 0
    for v in y:
        if np.isnan(v):
            run += 1
        else:
            count += run >= min_gap
            run = 0
    return count
