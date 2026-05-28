#!/usr/bin/env python3
"""
Build PersonalizedNutrition-v2.pen — a Pencil prototype file with the seven
core screens from screens2.html (dark theme), authored on a single
horizontal demo-stage canvas.

The .pen file format is a JSON document with a tree of nodes. Each node has a
type ("frame" | "rectangle" | "ellipse" | "text" | "icon_font" | "ref"), a
small set of layout / paint / typography / effect properties, and a children
array. Reusable components live at the root with `reusable: true` and are
instantiated elsewhere with `type: "ref", ref: "<componentId>"`, optionally
overriding descendants by id.

This script is the source of truth for the v2 file: edit it, re-run, commit
both the .py and the .pen. Generated JSON is ~tens of thousands of lines; do
not hand-edit the .pen unless you understand the consequences.

Design language is sourced from screens2.html's CSS tokens (the wise-signal
dark palette): brand green #1FA34A, emerald-deep #147A36, royal blue
#1D4ED8, signal-orange #D8610C, signal-yellow #FFC434, signal-risk
#CA371F, on a deep navy surface ramp #05141C → #14262E. Codes never
render as slate/gray — every code carries one of the five status hues
(red / brand-green / emerald-deep / orange / yellow).
"""

from __future__ import annotations

import json
import math
import os
import string
from typing import Any, Iterable

# ─── ID generation ────────────────────────────────────────────────────────
# Pencil ids are short alphanumeric tokens. We mint them deterministically
# from a counter so re-runs produce byte-identical output, which keeps the
# generated .pen friendly to git diffs.
_id_counter = 0
_ID_ALPHABET = string.ascii_letters + string.digits


def _next_id() -> str:
    """Return a new short id like "na", "nb", "nc"... rolling over to
    "nba", "nbb"... after 62 ids.

    The .pen format only cares that ids are unique within a file. We use
    a Base-62 alphabet of [a-zA-Z0-9] starting from `a`, so the very first
    id is "na" and there's no clash with positional digit '0' later in the
    sequence."""
    global _id_counter
    n = _id_counter
    _id_counter += 1
    base = len(_ID_ALPHABET)
    out: list[str] = []
    # Bijective base-62 encoding so position 0 is single-char "a", 61 is
    # "9", 62 is "ba", 63 is "bb", etc. — no leading zeros / no ambiguity.
    n += 1
    while n:
        n -= 1
        out.append(_ID_ALPHABET[n % base])
        n //= base
    return "n" + "".join(reversed(out))


def ID() -> str:
    return _next_id()


# ─── Design tokens (mirrors screens2.html :root dark theme) ──────────────
class T:
    # Surface ramp (dark)
    BG = "#05141C"             # canvas / app background
    BG_DEEP = "#011722"        # deepest surface (off-bg)
    SURFACE = "#0A2330"        # card surface
    SURFACE_2 = "#14262E"      # elevated surface / track well
    SURFACE_3 = "#1C2130"      # third surface tier / phone bezel inner
    INK_SOFT = "#021B27"       # darkest neutral
    LINE_SUBTLE = "#1F222A"    # divider
    LINE = "#2A2D36"           # default border
    LINE_STRONG = "#FFFFFF3D"  # strong border (white @ 24%)
    TRACK = "#2A2D36"
    TRACK_SUBTLE = "#14262E"
    # Text ramp
    FG_BRIGHT = "#F4F2F6"      # primary
    FG = "#F4F2F6"             # body
    FG_MUTED = "#B7B2C4"       # secondary
    FG_FAINT = "#A8A3B5"       # tertiary
    STATUS_FG = "#F4F2F6"
    # Identity colors
    EMERALD = "#1FA34A"        # brand green
    EMERALD_DARK = "#0E5C28"
    EMERALD_DEEP = "#147A36"
    EMERALD_LIGHT = "#3DBE6A"
    VIOLET = "#1D4ED8"         # royal blue (aliased --violet/--blue)
    AMBER = "#D8610C"          # signal-orange
    GOLD = "#FFC434"           # signal-yellow
    ROSE = "#FF8E8E"           # signal-risk soft (dark)
    RISK = "#CA371F"           # signal-risk
    CYAN = "#3B82F6"
    # Scrims
    SCRIM_STRONG = "#000000B3"  # ~0.7 alpha
    # Code/category swatches (aliased to identity above for v2). Codes
    # never render as slate — the fifth hue is emerald-deep, a darker
    # forest-green that sits beside the brand-green primary.
    CODE_GREEN = EMERALD
    CODE_AMBER = AMBER
    CODE_RED = RISK
    CODE_DEEP_GREEN = EMERALD_DEEP
    CODE_YELLOW = GOLD
    # Island
    ISLAND_BG = "#000000"
    # Tab-pill background (semi-transparent surface-2)
    TAB_PILL_BG = "#0A2330EB"  # rgba(10,35,48,0.92)
    SLOT_BG = "#0A2330E6"      # rgba(10,35,48,0.9)


FONT = "DM Sans"


# ─── Tiny node constructors ──────────────────────────────────────────────
# Helpers that emit dict literals matching the .pen schema. Each returns a
# fresh dict so call sites can mutate / extend before serializing.
def frame(
    *,
    width: Any = None,
    height: Any = None,
    layout: str = "horizontal",
    gap: int | None = None,
    padding: int | list[int] | None = None,
    justify: str | None = None,
    align: str | None = None,
    fill: Any = None,
    corner: int | list[int] | None = None,
    stroke: dict | None = None,
    effect: list | dict | None = None,
    children: list | None = None,
    x: int | None = None,
    y: int | None = None,
    name: str | None = None,
    clip: bool = False,
    opacity: float | None = None,
    layout_position: str | None = None,
    extra: dict | None = None,
) -> dict:
    """Build a frame node.

    Defaults match the most common pattern in the existing .pen file: a
    container with no fill, horizontal layout, no padding/gap. Pass `layout`
    explicitly to switch to vertical."""
    node: dict[str, Any] = {"type": "frame", "id": ID()}
    if name:
        node["name"] = name
    if x is not None:
        node["x"] = x
    if y is not None:
        node["y"] = y
    # Pen doesn't use the "hug" keyword — omit width/height to let pen
    # size to content. Only emit them when caller specifies a pixel
    # value or the "fill_container" keyword.
    if width is not None and width != "hug":
        node["width"] = width
    if height is not None and height != "hug":
        node["height"] = height
    if fill is not None:
        node["fill"] = fill
    if corner is not None:
        node["cornerRadius"] = corner
    if stroke is not None:
        node["stroke"] = stroke
    if effect is not None:
        node["effect"] = effect
    if layout != "horizontal":
        node["layout"] = layout
    if gap is not None:
        node["gap"] = gap
    if padding is not None:
        node["padding"] = padding
    # Pen treats `start` as the default for both axes; only emit when
    # the value actually differs.
    if justify is not None and justify != "start":
        node["justifyContent"] = justify
    if align is not None and align != "start":
        node["alignItems"] = align
    if clip:
        node["clip"] = True
    if opacity is not None:
        node["opacity"] = opacity
    if layout_position is not None:
        node["layoutPosition"] = layout_position
    if extra:
        node.update(extra)
    node["children"] = children or []
    return node


def text(
    content: str,
    *,
    size: int = 13,
    weight: str = "500",
    color: str = T.FG,
    family: str = FONT,
    letter: float | None = None,
    line_height: float | None = None,
    align: str | None = None,
    name: str | None = None,
    width: Any = None,
    wrap: int | None = None,
    height: Any = None,
    x: int | None = None,
    y: int | None = None,
    opacity: float | None = None,
    extra: dict | None = None,
) -> dict:
    """Text node. Pass `wrap=<px>` to force the text to wrap to a fixed
    pixel width (sets textGrowth=fixed-width)."""
    node: dict[str, Any] = {
        "type": "text",
        "id": ID(),
        "fill": color,
        "content": content,
        "fontFamily": family,
        "fontSize": size,
        "fontWeight": weight,
    }
    if name:
        node["name"] = name
    if letter is not None:
        node["letterSpacing"] = letter
    if line_height is not None:
        node["lineHeight"] = line_height
    if align:
        node["textAlign"] = align
    if wrap is not None:
        node["textGrowth"] = "fixed-width"
        node["width"] = wrap
    elif width is not None and width != "hug":
        node["width"] = width
    if height is not None:
        node["height"] = height
    if x is not None:
        node["x"] = x
    if y is not None:
        node["y"] = y
    if opacity is not None:
        node["opacity"] = opacity
    if extra:
        # Strip the unsupported `width: fill_container` shortcut; text
        # widths in pen are pixel-only.
        if extra.get("width") == "fill_container":
            extra = {k: v for k, v in extra.items() if k != "width"}
        node.update(extra)
    return node


def ellipse(
    *,
    width: int,
    height: int,
    fill: Any = "#FFFFFF",
    x: int | None = None,
    y: int | None = None,
    inner_radius: float | None = None,
    start_angle: float | None = None,
    sweep_angle: float | None = None,
    stroke: dict | None = None,
    effect: list | dict | None = None,
    opacity: float | None = None,
    name: str | None = None,
    layout_position: str | None = None,
    extra: dict | None = None,
) -> dict:
    node: dict[str, Any] = {
        "type": "ellipse",
        "id": ID(),
        "width": width,
        "height": height,
        "fill": fill,
    }
    if name:
        node["name"] = name
    if x is not None:
        node["x"] = x
    if y is not None:
        node["y"] = y
    if inner_radius is not None:
        node["innerRadius"] = inner_radius
    if start_angle is not None:
        node["startAngle"] = start_angle
    if sweep_angle is not None:
        node["sweepAngle"] = sweep_angle
    if stroke is not None:
        node["stroke"] = stroke
    if effect is not None:
        node["effect"] = effect
    if opacity is not None:
        node["opacity"] = opacity
    if layout_position is not None:
        node["layoutPosition"] = layout_position
    if extra:
        node.update(extra)
    return node


def rect(
    *,
    width: Any,
    height: Any,
    fill: Any = "#FFFFFF",
    x: int | None = None,
    y: int | None = None,
    corner: int | list[int] | None = None,
    stroke: dict | None = None,
    effect: list | dict | None = None,
    opacity: float | None = None,
    name: str | None = None,
    layout_position: str | None = None,
    extra: dict | None = None,
) -> dict:
    node: dict[str, Any] = {
        "type": "rectangle",
        "id": ID(),
        "width": width,
        "height": height,
        "fill": fill,
    }
    if name:
        node["name"] = name
    if x is not None:
        node["x"] = x
    if y is not None:
        node["y"] = y
    if corner is not None:
        node["cornerRadius"] = corner
    if stroke is not None:
        node["stroke"] = stroke
    if effect is not None:
        node["effect"] = effect
    if opacity is not None:
        node["opacity"] = opacity
    if layout_position is not None:
        node["layoutPosition"] = layout_position
    if extra:
        node.update(extra)
    return node


def icon(
    glyph: str,
    *,
    size: int = 16,
    color: str = T.FG,
    family: str = "lucide",
    x: int | None = None,
    y: int | None = None,
    opacity: float | None = None,
    extra: dict | None = None,
) -> dict:
    """Render an icon glyph. Maps Material-Symbols names used in
    screens2.html to lucide names that the .pen format understands."""
    node: dict[str, Any] = {
        "type": "icon_font",
        "id": ID(),
        "width": size,
        "height": size,
        "iconFontName": glyph,
        "iconFontFamily": family,
        "fill": color,
    }
    if x is not None:
        node["x"] = x
    if y is not None:
        node["y"] = y
    if opacity is not None:
        node["opacity"] = opacity
    if extra:
        node.update(extra)
    return node


# Pencil's JSON schema is camelCase ("layoutPosition", "cornerRadius",
# etc.). Most of our helpers translate their snake_case Python kwargs
# explicitly, but `ref()` historically used `**kwargs` and forwarded the
# names verbatim — which silently produced `"layout_position": "absolute"`
# on every status-bar instance, which Pencil ignored, dropping the bar
# back into the vertical screen flow at the bottom of the device. This
# map keeps the snake_case ergonomics at the call site while emitting
# the keys Pencil actually consumes.
_REF_KWARG_RENAMES = {
    "layout_position": "layoutPosition",
    "corner_radius":   "cornerRadius",
    "layout_position_absolute": "layoutPosition",
}


def ref(component_id: str, descendants: dict | None = None, **kwargs) -> dict:
    """Instantiate a reusable component. Pass `descendants` to override
    specific child nodes by their id. snake_case kwargs are normalised to
    Pencil's camelCase names via `_REF_KWARG_RENAMES`."""
    node: dict[str, Any] = {
        "type": "ref",
        "id": ID(),
        "ref": component_id,
    }
    for k, v in kwargs.items():
        if v is None:
            continue
        node[_REF_KWARG_RENAMES.get(k, k)] = v
    if descendants is not None:
        node["descendants"] = descendants
    return node


# ─── Material-Symbols → lucide glyph alias ───────────────────────────────
# screens2.html exclusively uses Material Symbols Outlined glyph names. The
# .pen format ships lucide as its built-in icon family. This table maps every
# MS glyph we reference back to its closest lucide equivalent so the rendered
# .pen looks right without us swapping the icon font.
LUCIDE = {
    # Tab bar
    "tune": "sliders-horizontal",
    "grid_view": "layout-grid",
    "qr_code_scanner": "scan-line",
    "chat_bubble": "message-circle",
    # Status / wifi
    "wifi": "wifi",
    # Generic
    "close": "x",
    "search": "search",
    "chevron_right": "chevron-right",
    "chevron_down": "chevron-down",
    "expand_more": "chevron-down",
    "check_circle": "check-circle-2",
    "history": "history",
    "info": "info",
    "barcode": "scan-barcode",
    "photo_camera": "camera",
    "arrow_upward": "arrow-up",
    "restart_alt": "rotate-ccw",
    "category": "layers",
    "sort_by_alpha": "arrow-down-a-z",
    "do_not_disturb_on": "minus-circle",
    "add": "plus",
    # Code icons
    "auto_awesome": "sparkles",
    "workspace_premium": "award",
    "monitor_heart": "heart-pulse",
    "speed": "gauge",
    "fitness_center": "dumbbell",
    "eco": "leaf",
    "shield": "shield",
    "water_drop": "droplet",
    "skeleton": "bone",
    "psychology": "brain",
    "checklist": "list-checks",
    "restaurant_menu": "salad",
    "block": "ban",
    "verified": "badge-check",
    "bolt": "zap",
    "bedtime": "moon",
    "all_inclusive": "infinity",
}


def mi(glyph: str, **kwargs) -> dict:
    """Material-Symbols → lucide icon shortcut."""
    return icon(LUCIDE.get(glyph, glyph), **kwargs)


# ─── Reusable components ─────────────────────────────────────────────────
# We park the components off-canvas at x=-2000 so they don't collide with
# the demo stage. Each one has a stable id we capture in module-level
# variables so the screen builders can `ref(...)` them by name.

# Status bar — 9:41 + signal bars + wifi + battery. Reused on every screen.
STATUSBAR_W = 378
STATUSBAR_H = 56


def make_statusbar() -> dict:
    """The 56-tall status bar. Mounted as an absolute child at the top of
    each screen frame (z=20 in screens2.html; here it just sits on top of
    the scroll content because we draw it last in the layer order)."""
    bars_h = [4, 6, 8, 10]
    return frame(
        name="component/StatusBar",
        x=-2000,
        y=120,
        width=STATUSBAR_W,
        height=STATUSBAR_H,
        fill="#00000000",
        layout="horizontal",
        justify="space_between",
        align="end",
        padding=[0, 28, 8, 28],
        extra={"reusable": True},
        children=[
            text(
                "9:41",
                size=15,
                weight="600",
                color=T.STATUS_FG,
            ),
            frame(
                width="hug",
                gap=6,
                align="center",
                fill="#00000000",
                children=[
                    # signal bars
                    frame(
                        width="hug",
                        gap=2,
                        align="end",
                        fill="#00000000",
                        children=[
                            rect(width=3, height=h, fill=T.STATUS_FG, corner=1)
                            for h in bars_h
                        ],
                    ),
                    mi("wifi", size=16, color=T.STATUS_FG),
                    # battery outer + inner fill (frame so we can nest the fill rectangle)
                    frame(
                        width=26,
                        height=13,
                        fill="#00000000",
                        corner=3,
                        stroke={"thickness": 1, "fill": T.STATUS_FG, "align": "inside"},
                        layout="none",
                        opacity=0.85,
                        children=[
                            # Inner fill: 75% wide
                            rect(width=17, height=9, fill=T.STATUS_FG, corner=1, x=2, y=2),
                        ],
                    ),
                ],
            ),
        ],
    )


# Phone frame — outer bezel (390×844, R54, 3px gradient border, deep shadow)
# with a slot child named "screen" (378×832 clipping frame) and the dynamic
# island + ambient glows pinned absolute on top.
def make_phoneframe() -> dict:
    screen_slot = frame(
        name="screen",
        x=6,
        y=6,
        width=378,
        height=832,
        fill=T.BG,
        corner=48,
        layout="vertical",
        clip=True,
    )
    # Capture the slot id so screen overrides can target it.
    PhoneFrame._screen_slot_id = screen_slot["id"]
    # Island (centered, 14 from top, 120×34, R999, black)
    island = frame(
        name="island",
        x=135,
        y=14,
        width=120,
        height=34,
        fill=T.ISLAND_BG,
        corner=24,
    )
    # Ambient blue glows — pinned absolute, behind the screen. We can't blur
    # in pen, so emulate the soft glow with low-opacity radial gradients on
    # large off-screen ellipses.
    glow_left = ellipse(
        name="glow-l",
        x=-96,
        y=-160,
        width=420,
        height=420,
        opacity=0.7,
        fill={
            "type": "gradient",
            "gradientType": "radial",
            "enabled": True,
            "rotation": 0,
            "size": {"width": 1, "height": 1},
            "colors": [
                {"color": "#1D4ED84D", "position": 0},  # royal blue @ 30%
                {"color": "#1D4ED800", "position": 0.7},
            ],
        },
    )
    glow_right = ellipse(
        name="glow-r",
        x=126,
        y=-128,
        width=360,
        height=360,
        opacity=0.7,
        fill={
            "type": "gradient",
            "gradientType": "radial",
            "enabled": True,
            "rotation": 0,
            "size": {"width": 1, "height": 1},
            "colors": [
                {"color": "#3B82F64D", "position": 0},
                {"color": "#3B82F600", "position": 0.7},
            ],
        },
    )

    pf = frame(
        name="component/PhoneFrame",
        x=-2000,
        y=0,
        width=390,
        height=844,
        fill=T.BG,
        corner=54,
        stroke={
            "thickness": 3,
            "fill": T.SURFACE_3,
            "align": "inside",
        },
        effect=[
            {
                "type": "shadow",
                "shadowType": "outer",
                "color": "#000000A8",  # ~0.66 alpha
                "offset": {"x": 0, "y": 30},
                "blur": 60,
                "spread": -10,
            },
            {
                "type": "shadow",
                "shadowType": "outer",
                "color": "#FFFFFF10",  # ~0.06 alpha
                "blur": 1,
                "spread": 1,
            },
        ],
        layout="none",
        extra={"reusable": True},
        children=[
            # Underlay: solid card matching screen-bg, sized to clip frame
            rect(name="bezel-inner", x=6, y=6, width=378, height=832, fill=T.BG, corner=48),
            glow_left,
            glow_right,
            screen_slot,
            island,
        ],
    )
    PhoneFrame._id = pf["id"]
    return pf


class PhoneFrame:
    """Holder for the PhoneFrame component id + its screen-slot id, so
    screen builders can do `phone(screen=...)` without threading them by
    argument."""

    _id: str = ""
    _screen_slot_id: str = ""


class StatusBar:
    _id: str = ""


def phone(*, screen_children: list, screen_extra: dict | None = None, x: int, y: int, name: str) -> dict:
    """Instantiate the PhoneFrame at (x, y) and override its "screen" slot
    with the given child list. `screen_extra` lets callers override the
    screen's fill (e.g., the camera background)."""
    screen_override = {
        "type": "frame",
        "id": ID(),
        "x": 0,
        "y": 0,
        "name": "screen",
        "clip": True,
        "width": 378,
        "height": 832,
        "fill": T.BG,
        "cornerRadius": 48,
        "layout": "vertical",
        "children": screen_children,
    }
    if screen_extra:
        screen_override.update(screen_extra)
    return ref(
        PhoneFrame._id,
        descendants={PhoneFrame._screen_slot_id: screen_override},
        name=name,
        x=x,
        y=y,
    )


# ─── Tab bar (inlined per-screen so the active state can differ) ────────
TAB_DEFS = [
    ("CODE", "tune"),
    ("BROWSE", "grid_view"),
    ("SCAN", "qr_code_scanner"),
    ("CHAT", "chat_bubble"),
]


def tabbar(active_index: int, *, violet_glow: bool = False) -> dict:
    """The bottom tab pill. `active_index` highlights one of four tabs.

    Per screens2.html the active-tab accent is royal blue everywhere now:
    `.tab.active` and `.tab.active.violet` both apply
    `box-shadow: 0 0 0 1px rgba(29, 78, 216, 0.35)` and tint the icon
    with `var(--blue)`. The legacy `violet_glow` kwarg is kept for
    call-site compatibility but no longer changes the rendering."""
    _ = violet_glow  # kept for call-site compat, ignored
    accent = T.VIOLET

    def tab(label: str, glyph: str, active: bool) -> dict:
        # Active tab gets surface-2 fill + a subtle accent-tinted hairline
        # (rendered as a 1px stroke since pen doesn't do box-shadow rings).
        if active:
            return frame(
                width="fill_container",
                height="fill_container",
                fill=T.SURFACE_2,
                corner=26,
                stroke={"thickness": 1, "fill": accent + "59", "align": "inside"},
                layout="vertical",
                gap=3,
                padding=[6, 0, 6, 0],
                justify="center",
                align="center",
                children=[
                    mi(glyph, size=20, color=accent),
                    text(label, size=10, weight="700", color=T.FG_BRIGHT, letter=0.7),
                ],
            )
        return frame(
            width="fill_container",
            height="fill_container",
            fill="#00000000",
            corner=26,
            layout="vertical",
            gap=3,
            padding=[6, 0, 6, 0],
            justify="center",
            align="center",
            children=[
                mi(glyph, size=20, color=T.FG_FAINT),
                text(label, size=10, weight="700", color=T.FG_FAINT, letter=0.7),
            ],
        )

    # Wrapper that mimics the .tab-bar div — truly floating: transparent
    # fill, no border. The pill is the only visible affordance; the phone
    # canvas shows through above, below, and around it. Matches the CSS:
    #   .tab-bar { position: relative; z-index: 20; flex-shrink: 0;
    #              padding: 12px 21px 21px; background: transparent; }
    return frame(
        name="tab-bar",
        width="fill_container",
        fill="#00000000",
        padding=[12, 21, 21, 21],
        children=[
            frame(
                name="tab-pill",
                width="fill_container",
                height=62,
                fill=T.TAB_PILL_BG,
                corner=999,
                stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
                padding=4,
                gap=0,
                effect={
                    "type": "shadow",
                    "shadowType": "outer",
                    "color": "#00000099",
                    "offset": {"x": 0, "y": 8},
                    "blur": 24,
                    "spread": -8,
                },
                children=[
                    tab(label, glyph, idx == active_index)
                    for idx, (label, glyph) in enumerate(TAB_DEFS)
                ],
            ),
        ],
    )


# ─── Common screen scaffolding ───────────────────────────────────────────
def status_bar_inst() -> dict:
    """A new instance of the status bar component, pinned absolute at the
    top of the screen frame."""
    return ref(
        StatusBar._id,
        layout_position="absolute",
        x=0,
        y=0,
    )


def scr_header(title: str, *, subtitle: str | None = None, trailing: dict | None = None) -> dict:
    """Top-of-screen header — h1 (24/800/-0.02em) + optional subtitle and
    trailing slot for an icon button (e.g., chat kebab). Mirrors
    .scr-hdr in screens2.html: padding 0 20 12 20, min-height 38, with
    h1 vertically centered against any neighbours."""
    title_node = text(
        title, size=24, weight="800", color=T.FG_BRIGHT, letter=-0.5, name="title"
    )
    title_col_children = [title_node]
    if subtitle:
        title_col_children.append(
            text(subtitle, size=12, weight="500", color=T.FG_MUTED, extra={"width": "fill_container"})
        )
    title_col = frame(
        layout="vertical",
        gap=4,
        fill="#00000000",
        children=title_col_children,
    )
    children: list = [title_col]
    if trailing:
        children.append(trailing)
    return frame(
        name="scr-hdr",
        width="fill_container",
        padding=[0, 20, 12, 20],
        justify="space_between",
        align="center",
        fill="#00000000",
        children=children,
    )


# ─── Pie chart helper ────────────────────────────────────────────────────
# screens2.html paints the rubric pie as a multi-segment donut. Pen's
# ellipse primitive supports `innerRadius` (0..1 from outer) and a
# `startAngle`/`sweepAngle` pair for arcs. Pencil's angle convention
# matches the existing ScoreRing in v1: 90° = 12 o'clock; positive sweep
# = counter-clockwise (we mirror by using negative sweep for CW).
PIE_SLICES = [
    ("Clean Label",       47, T.EMERALD, "auto_awesome"),
    ("Overall Quality",   23, T.AMBER,   "workspace_premium"),
    ("Heart Health",      15, T.RISK,    "monitor_heart"),
    ("Performance Score", 10, T.EMERALD_DEEP, "speed"),
    ("Muscle Health",      5, T.GOLD,    "fitness_center"),
]


def make_pie(*, size: int = 300, stroke: int = 94, slices=PIE_SLICES, center_num: str = "100",
             center_num_size: int = 46, center_size: int = 110,
             show_tags: bool = True) -> dict:
    """Render the rubric pie as a stack of arc ellipses + a center disc with
    composite-score text. Returns an absolutely-laid-out frame (size × size).

    Defaults mirror screens2.html: a 300-rendered donut (scaled from a
    280-viewBox SVG) with stroke 94 (88 px in viewBox × 300/280), a
    110-px center disc, and a 46-pt composite-score number. Screen 7
    overrides `center_num_size=52` for its larger Product-Detail donut.

    Each slice is one ellipse with innerRadius = (size/2 - stroke) / (size/2)
    and a startAngle/sweepAngle pair leaving a ~5° gap between neighbours."""
    R = size / 2
    r_inner = R - stroke
    inner_ratio = r_inner / R
    total = sum(v for _, v, _, _ in slices)
    gap_deg = 5  # gap between slices

    container_children: list = []
    cursor_deg = -90.0  # start at 12 o'clock, going CW
    for name, val, color, glyph in slices:
        span = (val / total) * 360.0
        a1 = cursor_deg + gap_deg / 2
        a2 = cursor_deg + span - gap_deg / 2
        cursor_deg += span
        if a2 <= a1:
            continue
        # Pencil convention (cross-checked against v1's progressArc:
        # startAngle 90 sweepAngle -320 draws a near-closed ring starting
        # at 12 o'clock going CW):
        #   pencil angle 0 = east, increases CCW with y-down inverted —
        #   so pencil 90 = 12 o'clock.
        #   negative sweepAngle draws clockwise (matches v1).
        # Our `a1` / `a2` are SVG-style (CW from east, y-down) starting
        # from -90° at the top. To convert SVG-CW → pencil-CCW we just
        # negate the angle.
        pencil_start = -a1
        pencil_sweep = -(a2 - a1)  # negative = CW
        container_children.append(
            ellipse(
                x=0,
                y=0,
                width=size,
                height=size,
                fill=color,
                inner_radius=inner_ratio,
                start_angle=pencil_start,
                sweep_angle=pencil_sweep,
                effect={
                    "type": "shadow",
                    "shadowType": "outer",
                    "color": "#00000059",
                    "offset": {"x": 0, "y": 1},
                    "blur": 2,
                },
                layout_position="absolute",
            )
        )

    if show_tags:
        # Per-slice tags: icon + percent painted near the centroid of each
        # slice. Centroid is at midR = (R + r_inner) / 2 in polar coords.
        # Tag sizing follows .pie-slice-tag in screens2.html: 28-px icon
        # cell at 22-px glyph + 18-px percent, vertically stacked with a
        # 2-px gap.
        mid_r = (R + r_inner) / 2
        cursor_deg = -90.0
        tag_w, tag_h = 44, 48
        for name, val, color, glyph in slices:
            span = (val / total) * 360.0
            mid_deg = cursor_deg + span / 2
            cursor_deg += span
            # Skip tags on tiny slices that can't fit them visually.
            if span < 18:  # ~5%
                continue
            theta = math.radians(mid_deg)
            lx = R + mid_r * math.cos(theta) - tag_w / 2
            ly = R + mid_r * math.sin(theta) - tag_h / 2
            container_children.append(
                frame(
                    layout_position="absolute",
                    x=int(round(lx)),
                    y=int(round(ly)),
                    width=tag_w,
                    height=tag_h,
                    fill="#00000000",
                    layout="vertical",
                    align="center",
                    gap=2,
                    children=[
                        mi(glyph, size=22, color="#FFFFFF"),
                        text(f"{val}%", size=18, weight="800", color="#FFFFFF"),
                    ],
                )
            )

    # Center disc — soft elevated circle with the composite score
    half_center = center_size // 2
    container_children.append(
        frame(
            layout_position="absolute",
            x=int(R - half_center),
            y=int(R - half_center),
            width=center_size,
            height=center_size,
            corner=center_size // 2,
            fill="#161E32",
            stroke={"thickness": 1, "fill": "#FFFFFF10", "align": "inside"},
            effect={
                "type": "shadow",
                "shadowType": "outer",
                "color": "#00000073",
                "offset": {"x": 0, "y": 6},
                "blur": 14,
            },
            layout="vertical",
            justify="center",
            align="center",
            gap=2,
            children=[
                text(center_num, size=center_num_size, weight="800",
                     color=T.FG_BRIGHT, letter=-1.0),
                text("OF 100", size=11, weight="700", color=T.FG_MUTED, letter=1.8),
            ],
        )
    )

    return frame(
        name="pie-wrap",
        width=size,
        height=size,
        fill="#00000000",
        layout="none",
        children=container_children,
    )


# ─── Slot row helpers (used on screens 1 & 6) ────────────────────────────
def slot_row(name: str, category: str, pct: int, color: str, glyph: str) -> dict:
    """A compact slot card: 30px square color tile w/ icon, name + category
    on the left, big bold percent on the right, then a faint minus-in-
    circle remove button."""
    return frame(
        name="slot-c",
        width="fill_container",
        height="hug",
        fill=T.SURFACE,
        corner=14,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[10, 12, 10, 12],
        gap=12,
        align="center",
        children=[
            frame(
                width=30,
                height=30,
                fill=color,
                corner=9,
                justify="center",
                align="center",
                children=[mi(glyph, size=18, color="#FFFFFF")],
            ),
            frame(
                layout="vertical",
                gap=2,
                fill="#00000000",
                extra={"width": "fill_container"},
                children=[
                    text(name, size=13, weight="700", color=T.FG_BRIGHT),
                    text(category.upper(), size=9, weight="700", color=T.FG_MUTED, letter=0.7),
                ],
            ),
            frame(
                width="hug",
                gap=1,
                align="end",
                fill="#00000000",
                children=[
                    text(str(pct), size=18, weight="800", color=T.FG_BRIGHT, letter=-0.4),
                    text("%", size=11, weight="700", color=T.FG_MUTED),
                ],
            ),
            frame(
                width=26,
                height=26,
                fill="#00000000",
                corner=999,
                justify="center",
                align="center",
                children=[mi("do_not_disturb_on", size=22, color=T.FG_FAINT)],
            ),
        ],
    )


# ─── Reset pill (top-right of pie card) ──────────────────────────────────
def reset_pill() -> dict:
    # Pie-card is 338-wide (378 screen − 2 × 20 horizontal padding). The
    # reset pill is ~62 wide (icon + label + paddings) and the spec wants
    # it 12 px from the right edge — so x = 338 − 12 − 62 = 264.
    return frame(
        layout_position="absolute",
        x=264,
        y=12,
        width="hug",
        height=22,
        fill="#00000000",
        corner=8,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[3, 9, 3, 9],
        gap=4,
        align="center",
        children=[
            mi("restart_alt", size=13, color=T.FG_MUTED),
            text("Reset", size=10, weight="700", color=T.FG_MUTED, letter=0.4),
        ],
    )


# ─── Screen builders ─────────────────────────────────────────────────────
# Each builder returns the list of children that go inside the phone's
# "screen" frame (378×832, vertical layout). The status bar + tab bar are
# added by the builder as needed.


def screen_1_your_code(*, status_label: str = "In Progress") -> list:
    """Screen 1 — Your Code (Home, In Progress).

    Structure: status bar (absolute) over a scroll column with the header,
    a pie-card hero containing the rubric pie + status caption, and a
    stack of 5 slot rows beneath. Tab bar pinned at the bottom."""
    pie_card_children = [
        reset_pill(),
        make_pie(),
        text(status_label, size=16, weight="800", color=T.FG_BRIGHT, letter=-0.16),
    ]
    pie_card = frame(
        name="pie-card",
        width="fill_container",
        fill=T.SURFACE,
        corner=24,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[18, 12, 12, 12],
        gap=4,
        layout="vertical",
        align="center",
        children=pie_card_children,
    )

    slot_stack = frame(
        layout="vertical",
        gap=10,
        fill="#00000000",
        extra={"width": "fill_container"},
        children=[slot_row(*s) for s in PIE_SLICES_AS_SLOT_ROW_ARGS()],
    )

    scroll = frame(
        name="scroll",
        width="fill_container",
        height="fill_container",
        fill="#00000000",
        layout="vertical",
        padding=[56, 0, 0, 0],  # status bar safe area
        children=[
            scr_header("Your Code"),
            frame(
                width="fill_container",
                layout="vertical",
                gap=16,
                fill="#00000000",
                padding=[0, 20, 0, 20],
                children=[pie_card, slot_stack],
            ),
        ],
    )

    return [scroll, tabbar(active_index=0), status_bar_inst()]


def PIE_SLICES_AS_SLOT_ROW_ARGS():
    """Pie data plus category labels needed by slot rows. Categories come
    straight from `CODE_CATALOG[i].category` in screens2.html."""
    cats = {
        "Clean Label": "Clean & Natural",
        "Overall Quality": "Overall",
        "Heart Health": "Health Outcomes",
        "Performance Score": "Performance Health",
        "Muscle Health": "Performance Health",
    }
    for name, val, color, glyph in PIE_SLICES:
        yield (name, cats[name], val, color, glyph)


# ─── Screen 2 — Add Code (Pick) bottom sheet ─────────────────────────────
# The picker is rendered as a bottom-sheet overlay covering the rubric
# beneath. screens2.html shows the static version (no animation), with the
# rubric not actually drawn beneath; we mirror that by emitting only the
# picker card + scrim, sitting on top of an empty backdrop.

# Mirrors WISE_CODES.CODE_CATALOG + CATEGORY_ORDER in screens2.html. Five
# categories, 17 codes total; each row is (display name, hue, MS icon).
# Hues match the live catalog exactly:
#   Health Outcomes  → risk red except Bone/Brain → emerald-deep green
#   Clean & Natural  → brand green
#   Quality & Content→ signal-orange amber
#   Performance Health→ signal-yellow gold except Performance Score → emerald-deep
#   Overall          → amber for Overall Quality, emerald-deep for Longevity
PICKER_CATALOG = [
    ("Health Outcomes", [
        ("Heart Health",         T.RISK,         "monitor_heart"),
        ("Gut Health",           T.RISK,         "eco"),
        ("Anti Inflammatory",    T.RISK,         "shield"),
        ("Blood Sugar Support",  T.RISK,         "water_drop"),
        ("Bone Health",          T.EMERALD_DEEP, "skeleton"),
        ("Brain Health",         T.EMERALD_DEEP, "psychology"),
    ]),
    ("Clean & Natural", [
        ("Clean Label",          T.EMERALD,      "auto_awesome"),
    ]),
    ("Quality & Content", [
        ("Ingredient Quality",   T.AMBER,        "checklist"),
        ("Nutrient Density",     T.AMBER,        "restaurant_menu"),
        ("Additive Free",        T.AMBER,        "block"),
        ("Allergen Friendly",    T.AMBER,        "verified"),
    ]),
    ("Performance Health", [
        ("Muscle Health",        T.GOLD,         "fitness_center"),
        ("Energy & Stamina",     T.GOLD,         "bolt"),
        ("Recovery Support",     T.GOLD,         "bedtime"),
        ("Performance Score",    T.EMERALD_DEEP, "speed"),
    ]),
    ("Overall", [
        ("Overall Quality",      T.AMBER,        "workspace_premium"),
        ("Longevity Score",      T.EMERALD_DEEP, "all_inclusive"),
    ]),
]


def pick_row(name: str, color: str, glyph: str) -> dict:
    """One row in the picker — icon tile (28×28, R8), name (14/700 bright),
    right-aligned chevron."""
    return frame(
        name="pick-row",
        width="fill_container",
        height="hug",
        fill=T.SURFACE,
        corner=14,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[10, 12, 10, 12],
        gap=12,
        align="center",
        children=[
            frame(
                width=28,
                height=28,
                fill=color,
                corner=8,
                justify="center",
                align="center",
                children=[mi(glyph, size=16, color="#FFFFFF")],
            ),
            text(name, size=14, weight="700", color=T.FG_BRIGHT,
                 extra={"width": "fill_container"}),
            mi("chevron_right", size=18, color=T.FG_FAINT),
        ],
    )


def screen_2_pick() -> list:
    """Screen 2 — Add Code (Pick).

    Bottom-sheet card filling most of the screen, with handle, "Pick a
    code" header + close button, search/sort toolbar, and a scroll list
    grouped by category. The dimmed rubric beneath isn't drawn in the
    static catalog — same here."""
    # Scrim that fills the screen behind the card
    scrim = rect(
        layout_position="absolute",
        x=0, y=0,
        width=378, height=832,
        fill=T.SCRIM_STRONG,
    )

    # Picker card chrome — sits flush to the bottom, leaving a status-bar
    # peek of ~64px above. Width = full, height = 832 - 64 = 768.
    card_children: list = []
    # Drag handle (top center)
    card_children.append(
        frame(
            width="fill_container",
            justify="center",
            align="center",
            fill="#00000000",
            padding=[2, 0, 10, 0],
            children=[
                rect(width=38, height=4, corner=2, fill=T.LINE_STRONG, opacity=0.5),
            ],
        )
    )
    # Header: title + close circle
    card_children.append(
        frame(
            width="fill_container",
            justify="space_between",
            align="center",
            fill="#00000000",
            padding=[0, 0, 12, 0],
            gap=12,
            children=[
                text("Pick a code", size=22, weight="800",
                     color=T.FG_BRIGHT, letter=-0.2),
                frame(
                    width=36, height=36,
                    fill=T.SURFACE_2,
                    corner=999,
                    stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
                    justify="center",
                    align="center",
                    children=[mi("close", size=20, color=T.FG)],
                ),
            ],
        )
    )
    # Toolbar: search + sort group
    card_children.append(
        frame(
            width="fill_container",
            gap=8,
            align="center",
            fill="#00000000",
            padding=[0, 0, 10, 0],
            children=[
                frame(
                    extra={"width": "fill_container"},
                    fill=T.SURFACE_2,
                    corner=12,
                    stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
                    padding=[8, 12, 8, 12],
                    gap=8,
                    align="center",
                    children=[
                        mi("search", size=18, color=T.FG_MUTED),
                        text("Search codes", size=14, weight="500", color=T.FG_FAINT),
                    ],
                ),
                # Sort group: active "category" + inactive "A-Z"
                frame(
                    width=36, height=36, corner=999,
                    fill=T.SURFACE_3,
                    stroke={"thickness": 1, "fill": T.LINE_STRONG, "align": "inside"},
                    justify="center", align="center",
                    children=[mi("category", size=18, color=T.FG_BRIGHT)],
                ),
                frame(
                    width=36, height=36, corner=999,
                    fill="#00000000",
                    stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
                    justify="center", align="center",
                    children=[mi("sort_by_alpha", size=18, color=T.FG_MUTED)],
                ),
            ],
        )
    )
    # Scroll list: category headers + rows
    list_children: list = []
    for cat_name, rows in PICKER_CATALOG:
        list_children.append(
            text(cat_name.upper(), size=10, weight="800",
                 color=T.FG_MUTED, letter=1.4,
                 extra={"width": "fill_container", "padding": [14, 4, 8, 4]})
        )
        for name, color, glyph in rows:
            list_children.append(pick_row(name, color, glyph))
    card_children.append(
        frame(
            extra={"width": "fill_container", "height": "fill_container"},
            layout="vertical",
            gap=6,
            fill="#00000000",
            children=list_children,
        )
    )

    # Pen doesn't support per-corner radius arrays — it's a single number
    # for all four corners. We fudge the "rounded top, flat bottom" sheet
    # by rounding the whole card (R22) but letting the screen frame clip
    # the bottom corners flush with the phone bezel.
    card = frame(
        name="code-picker-card",
        layout_position="absolute",
        x=0, y=64,
        width=378,
        height=768,
        fill=T.SURFACE,
        corner=22,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[10, 16, 16, 16],
        layout="vertical",
        effect={
            "type": "shadow",
            "shadowType": "outer",
            "color": "#000000A8",
            "offset": {"x": 0, "y": -20},
            "blur": 60,
            "spread": -10,
        },
        children=card_children,
    )

    return [scrim, card, status_bar_inst()]


# ─── Screen 3 — Browse (Top Matches) ─────────────────────────────────────
def prio_chip(pct: int, name: str, color: str, glyph: str) -> dict:
    """A single priority chip — circular colored icon, percent below, name
    in muted text."""
    return frame(
        width="fill_container",
        layout="vertical",
        align="center",
        gap=4,
        fill="#00000000",
        children=[
            frame(
                width=34, height=34, corner=999,
                fill=color,
                justify="center", align="center",
                children=[mi(glyph, size=18, color="#FFFFFF")],
            ),
            text(f"{pct}%", size=11, weight="800", color=T.FG_BRIGHT),
            text(name, size=9, weight="700", color=T.FG_MUTED, align="center",
                 extra={"width": "fill_container"}),
        ],
    )


def health_bar() -> dict:
    """The 5-segment color-divided bar painted under each Top Match row.
    Widths mirror the live rubric percentages (47/23/15/10/5)."""
    segs = [
        (47, T.EMERALD), (23, T.AMBER), (15, T.RISK),
        (10, T.EMERALD_DEEP), (5,  T.GOLD),
    ]
    # Without true flex children in pen, give each segment an explicit
    # pixel width that sums to ~290 (the card content width). Per-corner
    # radius arrays aren't supported by pen, so every segment uses a
    # single rounded radius (3px) and the end-pill effect is approximated.
    target_w = 290
    children = []
    for i, (flex, color) in enumerate(segs):
        seg_w = int(round(target_w * flex / 100))
        children.append(
            rect(width=seg_w, height=6, fill=color, corner=3)
        )
    return frame(
        name="health-bar",
        extra={"width": "fill_container"},
        height=6,
        gap=2,
        align="center",
        fill="#00000000",
        children=children,
    )


def food_row(name: str, brand: str, score: int, *, featured: bool = False,
             thumb_color: str = "#3F5128", thumb_dark: str = "#1F2A14") -> dict:
    """A food row card — thumb, name+brand, score on top; health bar +
    optional chevron beneath. Featured rows use a stronger border + a
    slightly larger score."""
    thumb_size = 64 if featured else 56
    thumb_corner = 14 if featured else 12
    thumb = frame(
        width=thumb_size,
        height=thumb_size,
        corner=thumb_corner,
        fill={
            "type": "gradient",
            "gradientType": "linear",
            "enabled": True,
            "rotation": 135,
            "size": {"height": 1},
            "colors": [
                {"color": thumb_color, "position": 0},
                {"color": thumb_dark, "position": 1},
            ],
        },
        justify="center",
        align="center",
        children=[
            # Stylised olive shapes: two overlapping ellipses
            ellipse(width=14, height=18, fill=thumb_dark, x=10, y=22),
            ellipse(width=14, height=18, fill=thumb_dark, x=20, y=18),
        ],
    )

    main_row = frame(
        extra={"width": "fill_container"},
        gap=12,
        align="center",
        fill="#00000000",
        children=[
            thumb,
            frame(
                extra={"width": "fill_container"},
                layout="vertical",
                gap=4,
                fill="#00000000",
                children=[
                    text(name, size=14 if featured else 13, weight="700",
                         color=T.FG_BRIGHT, line_height=1.2,
                         wrap=158 if featured else 168),
                    text(brand.upper(), size=9, weight="700",
                         color=T.FG_MUTED, letter=0.9),
                ],
            ),
            frame(
                width="hug",
                layout="vertical",
                align="end",
                gap=2,
                fill="#00000000",
                children=[
                    text(str(score), size=28 if featured else 22,
                         weight="800", color=T.FG_BRIGHT, letter=-0.6),
                    text("OF 100", size=8, weight="700",
                         color=T.FG_FAINT, letter=0.8),
                ],
            ),
        ],
    )

    bar_row_children: list = [health_bar()]
    if featured:
        bar_row_children.append(mi("chevron_right", size=18, color=T.FG_FAINT))
    bar_row = frame(
        extra={"width": "fill_container"},
        gap=10,
        align="center",
        fill="#00000000",
        children=bar_row_children,
    )

    return frame(
        name="food-row",
        extra={"width": "fill_container"},
        fill=T.SURFACE,
        corner=14,
        stroke={"thickness": 1,
                "fill": T.LINE_STRONG if featured else T.LINE,
                "align": "inside"},
        padding=12 if featured else [10, 12, 10, 12],
        layout="vertical",
        gap=10,
        children=[main_row, bar_row],
    )


def screen_3_browse() -> list:
    """Screen 3 — Browse (Top Matches)."""
    # Priorities head row: label + Rebalance affordance
    prio_head = frame(
        extra={"width": "fill_container"},
        justify="space_between",
        align="end",
        fill="#00000000",
        gap=12,
        children=[
            text("Your priorities", size=11, weight="700",
                 color=T.FG_MUTED, letter=0.4),
            text("Rebalance", size=11, weight="700",
                 color=T.VIOLET, letter=0.4),
        ],
    )

    # Five priority chips evenly spaced
    chips = frame(
        extra={"width": "fill_container"},
        gap=6,
        align="start",
        fill="#00000000",
        padding=[2, 0, 2, 0],
        children=[
            prio_chip(47, "Clean Label",       T.EMERALD, "auto_awesome"),
            prio_chip(23, "Overall Quality",   T.AMBER,   "workspace_premium"),
            prio_chip(15, "Heart Health",      T.RISK,    "monitor_heart"),
            prio_chip(10, "Performance Score", T.EMERALD_DEEP, "speed"),
            prio_chip(5,  "Muscle Health",     T.GOLD,    "fitness_center"),
        ],
    )

    # TOP MATCH tag + featured row
    top_match_tag = frame(
        width="hug",
        corner=4,
        fill=T.VIOLET,
        padding=[3, 8, 3, 8],
        children=[
            text("TOP MATCH", size=9, weight="800", color="#FFFFFF", letter=1.3),
        ],
    )
    featured = food_row(
        "Divina Kalamata Olives Pitted", "Divina", 98,
        featured=True, thumb_color="#5C7148", thumb_dark="#2F4225",
    )

    # ALL RESULTS · 183 meta row
    meta_row = frame(
        extra={"width": "fill_container"},
        justify="space_between",
        align="center",
        fill="#00000000",
        padding=[4, 2, 0, 2],
        children=[
            text("ALL RESULTS · 183", size=10, weight="800",
                 color=T.FG_MUTED, letter=1.4),
            frame(
                width="hug", gap=4, align="center",
                fill="#00000000",
                children=[
                    text("Best Match", size=10, weight="700",
                         color=T.FG, letter=0.4),
                    mi("expand_more", size=14, color=T.FG),
                ],
            ),
        ],
    )

    rows = frame(
        extra={"width": "fill_container"},
        layout="vertical",
        gap=6,
        fill="#00000000",
        children=[
            food_row("2× Divina Organic Pitted Green Olives", "Divina", 95,
                     thumb_color="#7DA45D", thumb_dark="#3F5128"),
            food_row("Castelvetrano Olives Pitted", "Divina", 93,
                     thumb_color="#A4B26C", thumb_dark="#566D2C"),
            food_row("Castelvetrano Organic Olives Pitted", "Divina", 91,
                     thumb_color="#B5C481", thumb_dark="#6E8634"),
            food_row("GAEA Organic Olives Pitted", "Gaea", 89,
                     thumb_color="#8FA257", thumb_dark="#465525"),
        ],
    )

    scroll = frame(
        name="scroll",
        width="fill_container",
        height="fill_container",
        fill="#00000000",
        layout="vertical",
        padding=[56, 0, 0, 0],
        children=[
            scr_header("Top Matches"),
            frame(
                extra={"width": "fill_container"},
                padding=[0, 20, 0, 20],
                layout="vertical",
                gap=16,
                fill="#00000000",
                children=[
                    frame(layout="vertical", gap=8, fill="#00000000",
                          extra={"width": "fill_container"},
                          children=[prio_head, chips]),
                    frame(layout="vertical", gap=6, fill="#00000000",
                          extra={"width": "fill_container"},
                          children=[top_match_tag, featured]),
                    meta_row,
                    rows,
                ],
            ),
        ],
    )

    return [scroll, tabbar(active_index=1), status_bar_inst()]


# ─── Screen 4 — Scan (Find a Food) ───────────────────────────────────────
def scan_circle() -> dict:
    """Concentric royal-blue rings + central viewfinder corners. Pen
    doesn't blur, so the soft radial wash is mimicked with a low-opacity
    blue ellipse fill."""
    return frame(
        name="scan-circle",
        width=260, height=260,
        fill="#1D4ED81A",  # rgba(29,78,216,0.1)
        corner=130,
        stroke={"thickness": 1, "fill": "#1D4ED838", "align": "inside"},
        layout="none",
        children=[
            # Middle ring (inset 36)
            ellipse(
                x=36, y=36, width=188, height=188,
                fill="#00000000",
                stroke={"thickness": 1, "fill": "#1D4ED838", "align": "inside"},
            ),
            # Inner filled ring (inset 72)
            ellipse(
                x=72, y=72, width=116, height=116,
                fill="#1D4ED829",
                stroke={"thickness": 1, "fill": "#1D4ED838", "align": "inside"},
            ),
            # Right-half sweep: faint blue half-overlay
            ellipse(
                x=130, y=0, width=130, height=260,
                fill="#1D4ED81A",
                opacity=0.6,
            ),
            # Center vertical hairline (radar axis)
            rect(x=129, y=0, width=1, height=260, fill="#1D4ED84D"),
            # Viewfinder TL corner
            frame(
                x=102, y=102,  # center the 56-box, so TL at (130-28, 130-28)=(102,102)
                width=18, height=18,
                fill="#00000000",
                layout="none",
                children=[
                    rect(x=0, y=0, width=18, height=2, fill=T.FG_BRIGHT, opacity=0.85),
                    rect(x=0, y=0, width=2, height=18, fill=T.FG_BRIGHT, opacity=0.85),
                ],
            ),
            # Viewfinder BR corner
            frame(
                x=140, y=140,
                width=18, height=18,
                fill="#00000000",
                layout="none",
                children=[
                    rect(x=0, y=16, width=18, height=2, fill=T.FG_BRIGHT, opacity=0.85),
                    rect(x=16, y=0, width=2, height=18, fill=T.FG_BRIGHT, opacity=0.85),
                ],
            ),
            # Viewfinder TR corner
            frame(
                x=140, y=102,
                width=18, height=18,
                fill="#00000000",
                layout="none",
                children=[
                    rect(x=0, y=0, width=18, height=2, fill=T.FG_BRIGHT, opacity=0.85),
                    rect(x=16, y=0, width=2, height=18, fill=T.FG_BRIGHT, opacity=0.85),
                ],
            ),
            # Viewfinder BL corner
            frame(
                x=102, y=140,
                width=18, height=18,
                fill="#00000000",
                layout="none",
                children=[
                    rect(x=0, y=16, width=18, height=2, fill=T.FG_BRIGHT, opacity=0.85),
                    rect(x=0, y=0, width=2, height=18, fill=T.FG_BRIGHT, opacity=0.85),
                ],
            ),
        ],
    )


def screen_4_scan() -> list:
    """Screen 4 — Scan (Find a Food)."""
    cta_scan = frame(
        extra={"width": "fill_container"},
        height=50,
        fill=T.VIOLET,
        corner=12,
        padding=[14, 20, 14, 20],
        justify="center", align="center", gap=10,
        effect={
            "type": "shadow", "shadowType": "outer",
            "color": "#1D4ED873",
            "offset": {"x": 0, "y": 8}, "blur": 20, "spread": -8,
        },
        children=[
            mi("photo_camera", size=18, color="#FFFFFF"),
            text("Scan a barcode", size=15, weight="800", color="#FFFFFF", letter=-0.16),
        ],
    )

    # "or enter UPC" divider — text with hairlines on either side. The
    # hairlines pretend to fill the container; pen sometimes wants a real
    # pixel width here, so we hand it ~120 each.
    upc_divider = frame(
        extra={"width": "fill_container"},
        align="center",
        gap=12,
        fill="#00000000",
        children=[
            rect(width="fill_container", height=1, fill=T.LINE),
            text("OR ENTER UPC", size=10, weight="800", color=T.FG_MUTED, letter=1.4),
            rect(width="fill_container", height=1, fill=T.LINE),
        ],
    )

    upc_field = frame(
        extra={"width": "fill_container"},
        fill=T.SURFACE,
        corner=12,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[10, 12, 10, 12],
        gap=8,
        align="center",
        children=[
            mi("barcode", size=14, color=T.FG_MUTED),
            text("0028400064057", size=13, weight="500",
                 color=T.FG_BRIGHT, letter=0.5,
                 extra={"width": "fill_container"}),
        ],
    )
    upc_lookup = frame(
        width="hug", height=42,
        fill=T.SURFACE_2,
        corner=10,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[10, 14, 10, 14],
        justify="center", align="center",
        children=[text("Look up", size=13, weight="700", color=T.FG_BRIGHT)],
    )
    upc_row = frame(
        extra={"width": "fill_container"},
        gap=8,
        align="center",
        fill="#00000000",
        children=[upc_field, upc_lookup],
    )

    # Scan circle centered in the upper portion
    scan_block = frame(
        extra={"width": "fill_container"},
        justify="center", align="center",
        padding=[12, 0, 4, 0],
        fill="#00000000",
        children=[scan_circle()],
    )

    # Bottom actions group — pushed down with margin-top: auto via a
    # fill_container spacer above it.
    bottom = frame(
        extra={"width": "fill_container"},
        layout="vertical",
        gap=16,
        fill="#00000000",
        children=[cta_scan, upc_divider, upc_row],
    )

    scroll = frame(
        name="scroll",
        width="fill_container", height="fill_container",
        fill="#00000000",
        layout="vertical",
        padding=[56, 0, 0, 0],
        children=[
            scr_header("Find a food", subtitle="Live weighted to your code."),
            frame(
                extra={"width": "fill_container", "height": "fill_container"},
                padding=[0, 20, 0, 20],
                layout="vertical",
                gap=16,
                fill="#00000000",
                children=[
                    scan_block,
                    # Spacer to push bottom group down
                    frame(extra={"width": "fill_container", "height": "fill_container"},
                          fill="#00000000", children=[]),
                    bottom,
                ],
            ),
        ],
    )

    return [scroll, tabbar(active_index=2), status_bar_inst()]


# ─── Screen 5 — Chat ─────────────────────────────────────────────────────
INTENT_LABELS = [
    "Eat clean", "More protein", "Avoid UPF", "Heart health",
    "Plant-forward", "Watch sugar", "Gluten-free", "Low sodium",
    "Anti-inflammatory", "Whole foods", "High fiber",
]


def intent_chip(label: str) -> dict:
    return frame(
        width="hug",
        fill=T.SURFACE,
        corner=8,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[6, 10, 6, 10],
        gap=6,
        align="center",
        children=[
            mi("auto_awesome", size=14, color=T.VIOLET),
            text(label, size=12, weight="600", color=T.FG_BRIGHT),
        ],
    )


def screen_5_chat() -> list:
    """Screen 5 — Chat with WISE AI."""
    # AI's opening message + intent chips inside its bubble
    avatar_ai = frame(
        width=36, height=36, corner=18,
        fill=T.VIOLET,
        justify="center", align="center",
        children=[mi("auto_awesome", size=20, color="#FFFFFF")],
    )
    intent_row_children: list = [
        text("TRY AN INTENT", size=10, weight="800", color=T.FG_MUTED, letter=1.4),
    ]
    intent_row_children.extend(intent_chip(l) for l in INTENT_LABELS)
    # Pen doesn't auto-wrap chips, so render them as a flex-wrap-ish stack
    # by chunking into rows of ~3.
    chip_chunks: list = []
    chunk_size = 3
    chip_chunks.append(
        frame(
            extra={"width": "fill_container"},
            gap=6, align="center",
            fill="#00000000",
            children=[text("TRY AN INTENT", size=10, weight="800",
                           color=T.FG_MUTED, letter=1.4)],
        )
    )
    for i in range(0, len(INTENT_LABELS), chunk_size):
        chip_chunks.append(
            frame(
                extra={"width": "fill_container"},
                gap=6,
                fill="#00000000",
                children=[intent_chip(l) for l in INTENT_LABELS[i:i + chunk_size]],
            )
        )
    bubble = frame(
        extra={"width": "fill_container"},
        layout="vertical",
        fill=T.SURFACE_2,
        corner=[4, 14, 14, 14],
        stroke={"thickness": 1, "fill": T.LINE_SUBTLE, "align": "inside"},
        padding=[10, 14, 10, 14],
        gap=10,
        children=[
            text(
                "Tell me what matters to you — diet style, goals, foods to "
                "avoid, anything. I'll compose a personal rubric and weight "
                "your code accordingly.",
                size=13, weight="500", color=T.FG, line_height=1.5,
                wrap=270,  # ~bubble inner width (378 - 40 px padding - 36 avatar - 10 gap - 28 bubble pad)
            ),
            frame(
                extra={"width": "fill_container"},
                layout="vertical",
                gap=6,
                fill="#00000000",
                children=chip_chunks,
            ),
        ],
    )
    body = frame(
        extra={"width": "fill_container"},
        layout="vertical",
        gap=4,
        fill="#00000000",
        children=[
            frame(
                extra={"width": "fill_container"},
                gap=8, align="end",
                fill="#00000000",
                padding=[0, 0, 4, 0],
                children=[
                    text("WISE AI", size=12, weight="800",
                         color=T.FG_BRIGHT, letter=-0.1),
                    text("9:41 AM", size=10, weight="600", color=T.FG_FAINT),
                ],
            ),
            bubble,
        ],
    )
    msg = frame(
        extra={"width": "fill_container"},
        gap=10,
        align="start",
        fill="#00000000",
        children=[avatar_ai, body],
    )

    chat_log = frame(
        name="chat-log",
        extra={"width": "fill_container", "height": "fill_container"},
        layout="vertical",
        padding=[8, 20, 12, 20],
        gap=12,
        justify="end",  # newer messages anchor to bottom
        fill="#00000000",
        children=[msg],
    )

    # Composer (textarea + send button)
    composer = frame(
        name="chat-composer",
        extra={"width": "fill_container"},
        fill=T.BG,
        padding=[10, 20, 12, 20],
        gap=8,
        align="end",
        stroke={"thickness": 1, "fill": T.LINE_SUBTLE, "align": "inside"},
        children=[
            frame(
                extra={"width": "fill_container"},
                fill=T.SURFACE_2,
                corner=12,
                stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
                padding=[10, 12, 10, 12],
                children=[
                    text("Message WISE AI…", size=13, weight="500",
                         color=T.FG_FAINT),
                ],
            ),
            frame(
                width=40, height=40, corner=10,
                fill=T.VIOLET,
                justify="center", align="center",
                opacity=0.45,
                effect={
                    "type": "shadow", "shadowType": "outer",
                    "color": "#1D4ED873",
                    "offset": {"x": 0, "y": 6}, "blur": 14, "spread": -6,
                },
                children=[mi("arrow_upward", size=20, color="#FFFFFF")],
            ),
        ],
    )

    scroll = frame(
        name="scroll",
        width="fill_container", height="fill_container",
        fill="#00000000",
        layout="vertical",
        padding=[56, 0, 0, 0],
        children=[
            scr_header("Chat with WISE AI"),
            chat_log,
            composer,
        ],
    )

    return [scroll, tabbar(active_index=3, violet_glow=True), status_bar_inst()]


# ─── Screen 7 — Food Detail ──────────────────────────────────────────────
def screen_7_food_detail() -> list:
    """Screen 7 — Product Detail for Vital Choice Wild Salmon."""
    # Product hero — thumb + name/brand + UPC pill
    product_thumb = frame(
        name="product-thumb",
        width=80, height=80,
        corner=18,
        fill=T.SURFACE_2,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        layout="none",
        children=[
            # Black package box
            rect(x=0, y=0, width=80, height=80, fill="#0F0F12", corner=18),
            # VitalChoice wordmark
            text("VitalChoice", size=7, weight="800", color=T.FG_BRIGHT,
                 letter=0.3, x=18, y=8, width=44, align="center"),
            text("WILD SALMON", size=4, weight="700", color="#9C99A6",
                 letter=0.7, x=14, y=18, width=52, align="center"),
            # Inner dark inset
            rect(x=8, y=30, width=64, height=40, fill="#1A1A22", corner=3),
            # Salmon fillet — angled rectangle approximated as ellipse-ish rect
            rect(x=12, y=42, width=56, height=22, fill="#E2613A", corner=2),
            rect(x=14, y=44, width=52, height=8, fill="#F08A5F", opacity=0.55, corner=2),
        ],
    )
    product_hero = frame(
        name="product-hero",
        extra={"width": "fill_container"},
        fill=T.SURFACE,
        corner=24,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=16,
        gap=14,
        align="center",
        children=[
            product_thumb,
            frame(
                extra={"width": "fill_container"},
                layout="vertical",
                gap=4,
                fill="#00000000",
                children=[
                    text("Wild Atlantic Salmon Fillet", size=17, weight="800",
                         color=T.FG_BRIGHT, letter=-0.2, line_height=1.15,
                         wrap=200),
                    text("Vital Choice", size=12, weight="500", color=T.FG_MUTED),
                    frame(
                        width="hug",
                        fill=T.SURFACE_2,
                        corner=999,
                        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
                        padding=[4, 10, 4, 10],
                        gap=6, align="center",
                        children=[
                            mi("barcode", size=14, color=T.FG_MUTED),
                            text("0028400064057", size=11, weight="600", color=T.FG, letter=0.2),
                        ],
                    ),
                ],
            ),
        ],
    )

    # Score card — verdict, contribution donut, table, summary
    verdict = frame(
        gap=8, align="center", fill="#00000000",
        children=[
            mi("check_circle", size=20, color=T.EMERALD),
            text("Excellent match for your code", size=14, weight="800",
                 color=T.EMERALD, letter=-0.07),
        ],
    )
    # Per screens2.html the Product-Detail donut is the largest of the
    # three: a 310-rendered SVG over a 280-viewBox (stroke 88). The
    # score card has 16-px padding on either side, leaving 306 px of
    # inner width — so we fit at 300 (one notch larger than the rubric
    # pie) with the same 94-px stroke proportion. Center disc stays
    # 110-px to match the rubric pies, but the composite number is
    # sized up to 52 pt for emphasis.
    donut = make_pie(center_num="97", center_num_size=52)

    # Contribution table rows. Names + colors come straight from
    # WISE_CODES.CODE_CATALOG; raw contributions are computed live in
    # screens2.html as weight × PRODUCT_SCORES[codeId] / 100:
    #   clean_label       47 × 94 / 100 = 44.2
    #   overall_quality   23 × 93 / 100 = 21.4
    #   heart_health      15 × 92 / 100 = 13.8
    #   performance_score 10 × 90 / 100 =  9.0
    #   muscle_health      5 × 88 / 100 =  4.4
    # Total raw = 92.77 → rounded 93. Composite = 93 + OTHER_FACTORS(4)
    # = 97 (driven through the donut center). Other Factors stays at 4.
    contrib_data = [
        ("Clean Label",       T.EMERALD,      "auto_awesome",      47, "44.2"),
        ("Overall Quality",   T.AMBER,        "workspace_premium", 23, "21.4"),
        ("Heart Health",      T.RISK,         "monitor_heart",     15, "13.8"),
        ("Performance Score", T.EMERALD_DEEP, "speed",             10, "9.0"),
        ("Muscle Health",     T.GOLD,         "fitness_center",     5, "4.4"),
    ]

    def contrib_row(name: str, color: str, glyph: str, pct: int, val: str) -> dict:
        # Per-side strokes aren't supported by pen, so we render the
        # bottom-divider as a hairline rectangle appended inside the row.
        return frame(
            extra={"width": "fill_container"},
            gap=12,
            align="center",
            fill="#00000000",
            padding=[10, 2, 10, 2],
            children=[
                frame(width=22, height=22, fill="#00000000",
                      justify="center", align="center",
                      children=[mi(glyph, size=20, color=color)]),
                text(name, size=14, weight="600", color=T.FG_BRIGHT, letter=-0.07,
                     extra={"width": "fill_container"}),
                text(f"{pct}%", size=13, weight="700", color=T.FG_MUTED,
                     align="end",
                     extra={"width": 40}),
                text(val, size=14, weight="700", color=T.FG_BRIGHT,
                     align="end",
                     extra={"width": 42}),
            ],
        )

    divider_line = lambda: rect(width="fill_container", height=1, fill=T.LINE_SUBTLE)

    contrib_list_children: list = []
    for i, c in enumerate(contrib_data):
        contrib_list_children.append(contrib_row(*c))
        if i < len(contrib_data) - 1:
            contrib_list_children.append(divider_line())
    contrib_list = frame(
        extra={"width": "fill_container"},
        layout="vertical",
        fill="#00000000",
        padding=[4, 0, 0, 0],
        children=contrib_list_children,
    )
    contrib_summary = frame(
        extra={"width": "fill_container"},
        layout="vertical",
        gap=12,
        fill="#00000000",
        children=[
            divider_line(),
            frame(
                extra={"width": "fill_container"},
                justify="space_between", align="center",
                gap=12,
                padding=[0, 0, 0, 0],
                fill="#00000000",
                children=[
                    text("Total Contribution: 93 of 100", size=11, weight="500",
                         color=T.FG_MUTED),
                    frame(
                        width="hug", gap=4, align="center", fill="#00000000",
                        children=[
                            text("Other Factors: 4 of 100", size=11, weight="500",
                                 color=T.FG_MUTED),
                            mi("info", size=14, color=T.FG_FAINT),
                        ],
                    ),
                ],
            ),
        ],
    )

    score_card = frame(
        name="score-card",
        extra={"width": "fill_container"},
        fill=T.SURFACE,
        corner=24,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=16,
        layout="vertical",
        gap=8,
        align="center",
        children=[verdict, donut, contrib_list, contrib_summary],
    )

    # About card — chevron-tipped link
    about_card = frame(
        name="about-card",
        extra={"width": "fill_container"},
        fill=T.SURFACE,
        corner=16,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[14, 16, 14, 16],
        gap=12, align="center",
        children=[
            frame(
                extra={"width": "fill_container"},
                layout="vertical", gap=4,
                fill="#00000000",
                children=[
                    text("ABOUT THIS SCORE", size=10, weight="800",
                         color=T.FG_MUTED, letter=1.4),
                    text("Your code's score is a weighted total of 5 factors. "
                         "Learn how we calculate your results.",
                         size=12, weight="500", color=T.FG, line_height=1.4,
                         wrap=280),
                ],
            ),
            mi("chevron_right", size=20, color=T.FG_FAINT),
        ],
    )

    # Last scanned timestamp
    last_scanned = frame(
        extra={"width": "fill_container"},
        justify="center", align="center", gap=6,
        padding=[4, 0, 2, 0],
        fill="#00000000",
        children=[
            mi("history", size=14, color=T.FG_FAINT),
            text("Last scanned today at 9:41 AM", size=11, weight="500",
                 color=T.FG_FAINT),
        ],
    )

    scroll = frame(
        name="scroll",
        width="fill_container", height="fill_container",
        fill="#00000000",
        layout="vertical",
        padding=[56, 0, 0, 0],
        children=[
            scr_header("Product Detail"),
            frame(
                extra={"width": "fill_container"},
                padding=[0, 20, 0, 20],
                layout="vertical",
                gap=16,
                fill="#00000000",
                children=[product_hero, score_card, about_card, last_scanned],
            ),
        ],
    )

    return [scroll, tabbar(active_index=1), status_bar_inst()]


# ─── Assemble ────────────────────────────────────────────────────────────
def build() -> dict:
    """Build the root .pen dict. Components first, then the demo-stage
    holding all phone refs."""
    sb = make_statusbar()
    StatusBar._id = sb["id"]
    pf = make_phoneframe()

    # Phones laid out in a horizontal-wrap row: 4 + 3, with 40px gap on
    # all sides. 4 phones at 390 + 3*40 gap = 1680, +80px side padding
    # → stage width 1760.
    phones: list = []
    # Stage internal positions. Pencil layout with `wrap` would be ideal,
    # but the existing v1 stage uses absolute placement, so we mirror it
    # for predictability across renderers.
    cols, gap = 4, 40
    px, py = 80, 120  # top-left of phone 1
    rect_w, rect_h = 390, 844
    phone_specs = [
        ("Phone 1 — Your Code (In Progress)",
         lambda: screen_1_your_code(status_label="In Progress")),
        ("Phone 2 — Add Code (Pick)",            screen_2_pick),
        ("Phone 3 — Browse (Top Matches)",       screen_3_browse),
        ("Phone 4 — Scan (Find a Food)",         screen_4_scan),
        ("Phone 5 — Chat with WISE AI",          screen_5_chat),
        ("Phone 6 — Your Code (In Harmony)",
         lambda: screen_1_your_code(status_label="In Harmony")),
        ("Phone 7 — Food Detail",                screen_7_food_detail),
    ]
    for i, (label, builder) in enumerate(phone_specs):
        col = i % cols
        row = i // cols
        x = px + col * (rect_w + gap)
        y = py + row * (rect_h + 160)  # extra space for label below phone
        phones.append(phone(screen_children=builder(), x=x, y=y, name=label))

    # Demo-stage frame — single canvas holding everything.
    stage = frame(
        name="Demo Stage — 7 phones",
        x=0,
        y=0,
        width=80 + cols * rect_w + (cols - 1) * gap + 80,
        height=200 + 2 * rect_h + 160,
        fill={
            "type": "gradient",
            "gradientType": "linear",
            "enabled": True,
            "rotation": 180,
            "size": {"height": 1},
            "colors": [
                {"color": T.BG, "position": 0},
                {"color": T.SURFACE, "position": 0.5},
                {"color": T.BG, "position": 1},
            ],
        },
        layout="none",
        clip=True,
        children=[
            # Stage ambient washes (mirror .stage radial gradients)
            ellipse(
                x=-200, y=-200, width=900, height=900, opacity=0.6,
                fill={
                    "type": "gradient",
                    "gradientType": "radial",
                    "enabled": True,
                    "rotation": 0,
                    "size": {"width": 1, "height": 1},
                    "colors": [
                        {"color": "#1FA34A2E", "position": 0},
                        {"color": "#05141C00", "position": 1},
                    ],
                },
            ),
            ellipse(
                x=1200, y=1500, width=900, height=900, opacity=0.6,
                fill={
                    "type": "gradient",
                    "gradientType": "radial",
                    "enabled": True,
                    "rotation": 0,
                    "size": {"width": 1, "height": 1},
                    "colors": [
                        {"color": "#1D4ED829", "position": 0},
                        {"color": "#05141C00", "position": 1},
                    ],
                },
            ),
            *phones,
        ],
    )

    root = {
        "version": "2.11",
        "children": [pf, sb, stage],
    }
    return root


def main() -> int:
    out_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "PersonalizedNutrition-v2.pen",
    )
    doc = build()
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=2)
        f.write("\n")
    print(f"Wrote {out_path} ({os.path.getsize(out_path):,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
