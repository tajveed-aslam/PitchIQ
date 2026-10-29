"""Juggling: count touches from the ball's path.

The signal is the ball's vertical position over time. In image coordinates y grows DOWNWARDS, so as the ball falls
y increases, and when a foot/knee/head sends it back up y starts decreasing. A touch is therefore a "turning point at
the bottom": the lowest point between a fall and the next rise.

To ignore jitter, a turning point only counts if the ball then rises by at least `min_rise` pixels (about half a
ball diameter): a hysteresis state machine, the same idea a thermostat uses to avoid flicking on and off.

The bottom of an arc is exactly when the foot covers the ball, so the tracker often loses it for a few frames right
at the touch. Gaps are therefore filled with physics, not straight lines (see _fill_gaps): a fall before the gap and
a rise after it meet in a "V" whose point is the touch. When the gap is long, the touch is put where the rising ball,
traced backwards, was last at ground level. Touches inferred inside long gaps are marked uncertain; the result says
how many touches are certain, and gives a range, instead of pretending to be exact.

Input is the RAW tracker output (no interpolation): the gap reasoning needs to know which frames were really seen.
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
    certain: bool  # False when inferred across a long gap in the tracking


@dataclass
class JugglingResult:
    touches: list[Touch]
    fps: float
    hidden_gaps: int = 0  # unseen stretches long enough to hide a touch, with no touch inferred in them

    @property
    def count(self) -> int:
        return len(self.touches)

    @property
    def certain(self) -> int:
        return sum(t.certain for t in self.touches)

    @property
    def range(self) -> tuple[int, int]:
        """Plausible range: at the low end only the certain touches; at the high end every counted touch plus one
        for each long unseen stretch that no inferred touch explains."""
        return self.certain, self.count + self.hidden_gaps

    def summary(self) -> dict:
        return {"touches": self.count, "certain": self.certain, "range": list(self.range),
                "times": [round(t.time, 2) for t in self.touches]}


def _clean_heights(points: list[BallPoint | None], ball: float) -> np.ndarray:
    """Ball y per frame (NaN where unknown). Removes glitches only:
    - a point far from BOTH neighbours (more than 1.5 ball diameters from their average);
    - a point that no nearby detection agrees with: reaching it from the closest detection on either side (within
      a few frames) would take an impossible speed, over a ball diameter per frame (spike 2c: a false detection at
      the bottom of the frame while the real ball was above the top edge). Sparse but consistent points are kept:
      they're often the only sighting of a bounce's bottom.
    Deliberately NOT a median/average filter: those flatten the bottom of each bounce, which is exactly the turning
    point touches are counted from (found in spike 2b)."""
    y = np.array([p.y if p is not None else np.nan for p in points], dtype=float)
    out = y.copy()
    for i in range(1, len(y) - 1):
        a, b = y[i - 1], y[i + 1]
        if not (np.isnan(a) or np.isnan(b) or np.isnan(y[i])) and abs(y[i] - (a + b) / 2) > 1.5 * ball:
            out[i] = np.nan
    seen = np.flatnonzero(~np.isnan(out))
    keep = out.copy()
    for n, i in enumerate(seen):
        near = [j for j in (seen[n - 1] if n > 0 else None, seen[n + 1] if n + 1 < len(seen) else None)
                if j is not None and abs(j - i) <= 7]
        if near and all(abs(out[i] - out[j]) > ball * (abs(i - j) + 0.5) for j in near):
            keep[i] = np.nan
    return keep


BALL_METRES = 0.22  # diameter of a size-5 football


def _gravity(ball: float, fps: float) -> float:
    """Gravity in pixels per frame², using the ball as the ruler (it's at about the player's distance)."""
    return 9.81 * (ball / BALL_METRES) / fps**2


def _velocity(y: np.ndarray, i: int, direction: int, g: float, reach: int = 3) -> float | None:
    """Vertical speed (px/frame) at frame i, from i and the nearest known frame on one side (direction -1 = before,
    +1 = after), corrected for gravity (a two-frame difference is the speed halfway between them). None if there's
    no known frame close enough."""
    for k in range(1, reach + 1):
        j = i + direction * k
        if 0 <= j < len(y) and not np.isnan(y[j]):
            return (y[i] - y[j]) / (i - j) + g * (i - j) / 2
    return None


def _fill_gaps(y: np.ndarray, ball: float, fps: float, max_gap: int) -> tuple[np.ndarray, np.ndarray]:
    """Fill the frames where the ball wasn't seen. Returns the filled heights and, per frame, the length of the gap
    it was filled in (0 = really seen).
    - If the ball comes out of the gap going up faster than free flight allows (gravity only ever slows a rising
      ball), it was kicked inside the gap, usually while the foot covered it. The flight before the gap and the
      flight after it are both parabolas under the same gravity; where they meet is the touch.
    - If they'd meet below ground level, or the gap is long, the ball must have stopped low (on the ground or the
      foot) and been lifted again, so the touch is put where the rising ball, traced back, was at ground level.
    - Otherwise short gaps get a straight line and long ones stay unknown."""
    out, gap_len = y.copy(), np.zeros(len(y), dtype=int)
    known = np.flatnonzero(~np.isnan(y))
    if len(known) < 2:
        return out, gap_len
    g = _gravity(ball, fps)
    floor = float(np.nanpercentile(y, 98))  # about ground level: the lowest the ball is seen (bigger y = lower)
    moving = ball / 20  # px/frame: slower than this is "hanging" at the top of an arc, not clearly up or down
    kick = ball / 8  # px/frame: a speed change this much beyond gravity is a contact, not detection noise

    def fill(a: int, b: int, curve):
        for j in range(a + 1, b):
            out[j], gap_len[j] = curve(j), n

    for a, b in zip(known, known[1:]):
        n = b - a - 1
        if n == 0:
            continue
        # Speed before the gap from the already-filled side, so a gap right after another one still has one.
        va, vb = _velocity(out, a, -1, g), _velocity(y, b, +1, g)
        if va is not None and vb is not None and vb < -moving and vb < va + g * (b - a) - kick:
            ya, yb = y[a], y[b]
            before = lambda t: ya + va * (t - a) + g / 2 * (t - a) ** 2  # noqa: E731
            after = lambda t: yb + vb * (t - b) + g / 2 * (t - b) ** 2  # noqa: E731
            # The g·t² terms cancel when the two parabolas are equated, leaving a straight-line equation for t.
            k = (yb - ya + va * a - vb * b + g / 2 * (b - a) * (a + b)) / (va - vb + g * (b - a))
            if n > max_gap or not a < k < b or before(k) > floor:
                yk = max(floor, ya, yb)
                s = (vb + np.sqrt(vb**2 + 2 * g * (yk - yb))) / g  # frames from ground level up to b (vb < 0)
                k = b - s
            k = int(round(min(max(k, a + 1), b - 1)))
            out[k], gap_len[k] = min(after(k), max(floor, ya, yb)), n
            if k - a - 1 <= max_gap:
                fill(a, k, lambda j: ya + (out[k] - ya) * (j - a) / (k - a))
            fill(k, b, after)
        elif n <= max_gap:
            fill(a, b, lambda j: y[a] + (y[b] - y[a]) * (j - a) / (b - a))
    return out, gap_len


def count_touches(points: list[BallPoint | None], fps: float, min_arc_seconds: float = 0.25,
                  max_gap: int = 6) -> JugglingResult:
    sizes = [p.size for p in points if p is not None]
    if not sizes:
        return JugglingResult([], fps)
    ball = float(np.median(sizes))
    seen = _clean_heights(points, ball)
    y, gap_len = _fill_gaps(seen, ball, fps, max_gap)
    g = _gravity(ball, fps)
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
        dropping_in = (v := _velocity(y, prev, -1, g, reach=1)) is not None and v > 0
        if falling and gap >= min_gap and y[low_i] - y[i] < min_rise and not dropping_in:
            # The ball vanished while low (and not still dropping) and came back still low: a whole arc happened
            # out of sight, so the low point before the gap was a touch. Counted, but marked uncertain.
            # (Still dropping into the gap is different: that's one fall, and _fill_gaps already placed its touch.)
            add(low_i, certain=False)
            low_i = i
        prev = i
        if y[i] >= y[low_i]:
            low_i = i  # new lowest point (bigger y = lower); on a flat stretch, the last frame before it rises
        if y[i] < y[high_i]:
            high_i = i
        if falling:
            if y[low_i] - y[i] >= min_rise:  # bottomed out and came back up: a touch
                # Seen, or inferred inside a short gap (the foot covering the ball for up to max_gap frames, with
                # a clear kick on both sides): certain. Inferred across a long gap: uncertain.
                gap_near = gap_len[low_i] > max_gap or np.isnan(y[max(0, low_i - 2):low_i + 3]).any()
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
    return JugglingResult(touches, fps, hidden_gaps=_unexplained_gaps(y, touches, min_gap))


def _unexplained_gaps(y: np.ndarray, touches: list[Touch], min_gap: int) -> int:
    """Stretches of unseen frames long enough to hide a touch (including one at the very end of the clip) where no
    inferred touch was placed. Each one may hide a touch: the top of the range counts one per gap."""
    inferred = [t.frame for t in touches if not t.certain]
    count, start = 0, None
    for i, v in enumerate(np.append(y, 0.0)):  # the extra known value closes a gap that runs to the end
        if np.isnan(v):
            start = i if start is None else start
        elif start is not None:
            if i - start >= min_gap and not any(start - min_gap <= f <= i for f in inferred):
                count += 1
            start = None
    return count
