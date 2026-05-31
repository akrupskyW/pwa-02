#!/usr/bin/env python3
"""
Build PersonalizedNutrition-v2.pen — a Pencil prototype file mirroring the
ten phone screens from screens2.html (intro, persona picker, empty code,
your code home, code picker, browse, scan, chat, food detail, settings),
each rendered dark + light, authored on a single horizontal demo-stage
canvas. The DS · Design System foundations board is intentionally omitted.

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
# The screen builders only ever read from `T` (dark). The light variant
# of every screen is produced by `recolor_for_light()`, a postprocess
# walker that deep-copies a built dark subtree (minting fresh ids) and
# swaps dark hex values for their light-theme equivalents via the
# `DARK_TO_LIGHT_HEX` table below. Identity hues (emerald, royal blue,
# amber, gold, risk-red, emerald-deep) and the on-color contrast
# white/black are theme-agnostic, so they aren't in the map.
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
    # Tab bar (HOME generation) + onboarding / settings glyphs
    "home": "home",
    "settings": "settings",
    "arrow_forward": "arrow-right",
    "autorenew": "refresh-cw",
    "add_to_home_screen": "smartphone",
    "ios_share": "share",
    "add_box": "square-plus",
    "touch_app": "pointer",
    # Persona glyphs
    "public": "globe",
    "medical_services": "briefcase-medical",
    "nutrition": "apple",
    "self_improvement": "person-standing",
    "savings": "piggy-bank",
    "family_restroom": "users",
    "science": "flask-conical",
    "check": "check",
    # Settings glyphs
    "contrast": "contrast",
    "dark_mode": "moon",
    "light_mode": "sun",
    "visibility": "eye",
    "login": "log-in",
    "person_add": "user-plus",
    "location_on": "map-pin",
    # Chart toggle (Your Code + Food Detail)
    "dashboard": "layout-dashboard",
}


def mi(glyph: str, **kwargs) -> dict:
    """Material-Symbols → lucide icon shortcut."""
    return icon(LUCIDE.get(glyph, glyph), **kwargs)


# ─── Theme — dark → light recolor ────────────────────────────────────────
# Mirrors `:root[data-theme="light"], .theme-light` in screens2.html. The
# table is hex-keyed, not token-keyed, because the script bakes raw hex
# values into the JSON; the walker swaps any matching string field on a
# cloned subtree. Only surface ramp / text ramp / line / shadow tokens
# differ across themes — identity hues (brand-green, royal-blue, amber,
# gold, risk-red, emerald-deep) and on-color whites stay put.
DARK_TO_LIGHT_HEX: dict[str, str] = {
    # Surfaces
    "#05141C":   "#EFEDF1",     # BG → bg-page
    "#011722":   "#FBF6ED",     # BG_DEEP → signal-paper-tint
    "#0A2330":   "#FFFFFF",     # SURFACE / CARD → white
    "#14262E":   "#FBF6ED",     # SURFACE_2 / TRACK_SUBTLE → paper-tint
    "#1C2130":   "#EFEDF1",     # SURFACE_3 / card-elev / bezel-inner
    "#021B27":   "#EFEDF1",     # INK_SOFT
    # Lines / dividers
    "#1F222A":   "#ECE9F0",     # LINE_SUBTLE
    "#2A2D36":   "#EFEDF1",     # LINE / TRACK
    "#FFFFFF3D": "#827C90",     # LINE_STRONG: white-24% → signal-slate
    # Text ramp
    "#F4F2F6":   "#000000",     # FG / FG_BRIGHT / STATUS_FG
    "#B7B2C4":   "#413A4D",     # FG_MUTED
    "#A8A3B5":   "#544E61",     # FG_FAINT
    # Composite tokens (surface w/ alpha)
    "#0A2330E6": "#FFFFFFE6",   # SLOT_BG: surface @ 0.9 → white @ 0.9
    "#0A2330EB": "#FFFFFFF5",   # TAB_PILL_BG: surface @ 0.92 → white @ 0.96
    # Shadow colors: pure black at various alphas → ink-purple at lower alphas
    "#000000A8": "#0F0A1F38",   # phone outer shadow (~0.66 → ~0.22)
    "#00000099": "#0F0A1F33",   # tab-pill shadow (~0.6 → ~0.2)
    "#00000073": "#0F0A1F2E",   # pie-center disc shadow (~0.45 → ~0.18)
    "#000000B3": "#0F0A1F52",   # scrim-strong (~0.7 → ~0.32)
    "#00000059": "#0F0A1F1F",   # pie slice inner shadow
    # White-alpha inset → dark-alpha inset
    "#FFFFFF10": "#0F0A1F0A",
    # Pie-center disc fill (dark navy → cream)
    "#161E32":   "#F5F2EC",
    # Rose: dark rose (#FF8E8E AAA-on-dark) → risk-light (#CA371F AAA-on-light)
    "#FF8E8E":   "#CA371F",
    # Stage gradient stops referencing BG with 00-alpha → light bg with 00-alpha
    "#05141C00": "#EFEDF100",
}


def _hex_to_light(value: str) -> str:
    """Return the light-theme equivalent of a hex string, or the value
    unchanged if it isn't in the mapping. Accepts any case; returns the
    canonical 6/8-char uppercase form found in the map."""
    return DARK_TO_LIGHT_HEX.get(value.upper(), value)


def deep_clone_with_new_ids(node: Any) -> Any:
    """Recursively deep-copy a node tree, minting a fresh id on every
    dict that carries one. Keeps tree shape and every other field
    identical so subsequent walks (recolor, ref-relink) can find the
    nodes they need to mutate.

    Used to spawn the light twin of a built dark subtree without
    sharing ids (which would break the .pen file's unique-id invariant
    and confuse the renderer)."""
    if isinstance(node, dict):
        new: dict[str, Any] = {}
        for k, v in node.items():
            if k == "id":
                new[k] = ID()
            else:
                new[k] = deep_clone_with_new_ids(v)
        return new
    if isinstance(node, list):
        return [deep_clone_with_new_ids(v) for v in node]
    return node


def recolor_for_light(node: Any) -> None:
    """In-place dark → light recolor of a node tree. Walks every dict
    key, replacing string values that match `DARK_TO_LIGHT_HEX` with
    their light counterparts. Operates on color fields wherever they
    appear: `fill`, `stroke.fill`, `effect.color`, gradient stop
    `colors[].color`, text `fill`. Anything not in the map (identity
    hues, white/black contrast colors, food-thumb illustration colors)
    is left untouched."""
    if isinstance(node, dict):
        for k, v in list(node.items()):
            if isinstance(v, str) and v.startswith("#"):
                node[k] = _hex_to_light(v)
            elif isinstance(v, (dict, list)):
                recolor_for_light(v)
    elif isinstance(node, list):
        for v in node:
            recolor_for_light(v)


def find_node_by_name(node: Any, name: str) -> dict | None:
    """First-match recursive search for a node by its `name` field."""
    if isinstance(node, dict):
        if node.get("name") == name:
            return node
        for v in node.values():
            hit = find_node_by_name(v, name)
            if hit is not None:
                return hit
    elif isinstance(node, list):
        for v in node:
            hit = find_node_by_name(v, name)
            if hit is not None:
                return hit
    return None


def relink_refs(node: Any, mapping: dict[str, str]) -> None:
    """In-place walk that retargets any `{type: "ref", ref: <old>}`
    nodes to their replacement id per `mapping`. Used after cloning a
    dark subtree into a light one: the cloned status-bar refs still
    point to the dark component, so we relink them to the light
    component's id."""
    if isinstance(node, dict):
        if node.get("type") == "ref":
            old = node.get("ref")
            if old in mapping:
                node["ref"] = mapping[old]
        for v in node.values():
            if isinstance(v, (dict, list)):
                relink_refs(v, mapping)
    elif isinstance(node, list):
        for v in node:
            relink_refs(v, mapping)


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
    """Holder for the dark + light PhoneFrame component ids and their
    screen-slot ids. Filled in by `build()` once each component has
    been emitted, then read by `phone(theme=...)` so the same screen
    builder can target either bezel."""

    _id: str = ""             # legacy alias → dark
    _screen_slot_id: str = ""  # legacy alias → dark slot
    dark_id: str = ""
    dark_slot: str = ""
    light_id: str = ""
    light_slot: str = ""


class StatusBar:
    """Holder for the dark + light StatusBar component ids."""

    _id: str = ""    # legacy alias → dark
    dark_id: str = ""
    light_id: str = ""


def phone(
    *,
    screen_children: list,
    screen_extra: dict | None = None,
    x: int,
    y: int,
    name: str,
    theme: str = "dark",
) -> dict:
    """Instantiate the PhoneFrame at (x, y) and override its "screen"
    slot with the given child list. `theme="light"` swaps to the light
    bezel component + a paper-tinted screen fill so the override
    matches the surrounding bezel and the recolored screen children.
    `screen_extra` lets callers override the screen's fill (e.g., the
    camera background)."""
    if theme == "light":
        pf_id = PhoneFrame.light_id
        slot_id = PhoneFrame.light_slot
        screen_fill = _hex_to_light(T.BG)
    else:
        pf_id = PhoneFrame.dark_id
        slot_id = PhoneFrame.dark_slot
        screen_fill = T.BG
    screen_override = {
        "type": "frame",
        "id": ID(),
        "x": 0,
        "y": 0,
        "name": "screen",
        "clip": True,
        "width": 378,
        "height": 832,
        "fill": screen_fill,
        "cornerRadius": 48,
        "layout": "vertical",
        "children": screen_children,
    }
    if screen_extra:
        screen_override.update(screen_extra)
    return ref(
        pf_id,
        descendants={slot_id: screen_override},
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

# The HOME-generation tab set used by the onboarding / settings screens in
# screens2.html (`home` / `qr_code_scanner` / `chat_bubble` / `settings`).
# The older catalog screens (Code / Browse / Scan / Chat) keep TAB_DEFS.
TAB_DEFS_HOME = [
    ("HOME", "home"),
    ("SCAN", "qr_code_scanner"),
    ("CHAT", "chat_bubble"),
    ("SETTINGS", "settings"),
]


def tabbar(active_index: int, *, violet_glow: bool = False, defs=TAB_DEFS) -> dict:
    """The bottom tab pill. `active_index` highlights one of the four tabs
    in `defs` (pass -1 for no active tab, e.g. the intro/persona screens).

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
                    for idx, (label, glyph) in enumerate(defs)
                ],
            ),
        ],
    )


# ─── Common screen scaffolding ───────────────────────────────────────────
def status_bar_inst(theme: str = "dark") -> dict:
    """A new instance of the status bar component, pinned absolute at the
    top of the screen frame. Screen builders always pass the dark id;
    the light variant of each screen is produced by deep-cloning the
    dark tree and then `relink_refs` swaps every dark statusbar ref
    onto the light statusbar component."""
    component_id = StatusBar.light_id if theme == "light" else StatusBar.dark_id
    return ref(
        component_id,
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

# The default "In Harmony" code — the 10-slot composition authored on
# screens 1b / 3 / 6 of the latest screens2.html (INITIAL_SLOTS ×
# CODE_CATALOG). Each tuple is
#   (codeId, display name, weight %, hue, MS icon, salmon score)
# where `salmon score` is PRODUCT_SCORES[codeId] — the example food's
# per-code performance that drives the Food-Detail contribution math
# (contribution = weight × score / 100). Weights sum to 100.
DEFAULT_CODE = [
    ("clean_label",       "Clean Label",       20, T.EMERALD,      "auto_awesome",      94),
    ("overall_quality",   "Overall Quality",   15, T.AMBER,        "workspace_premium", 93),
    ("heart_health",      "Heart Health",      12, T.RISK,         "monitor_heart",     92),
    ("performance_score", "Performance Score", 11, T.EMERALD_DEEP, "speed",             90),
    ("muscle_health",     "Muscle Health",     10, T.GOLD,         "fitness_center",    88),
    ("gut_health",        "Gut Health",         8, T.RISK,         "eco",               70),
    ("nutrient_density",  "Nutrient Density",   8, T.AMBER,        "restaurant_menu",   92),
    ("brain_health",      "Brain Health",       6, T.EMERALD_DEEP, "psychology",        96),
    ("energy_stamina",    "Energy & Stamina",   5, T.GOLD,         "bolt",              86),
    ("longevity_score",   "Longevity Score",    5, T.EMERALD_DEEP, "all_inclusive",     91),
]

# Pie/health-bar slice tuples (name, weight, hue, icon) derived from the
# default code, used by the code donut, browse health bar, and the
# Food-Detail contribution donut.
DEFAULT_PIE_SLICES = [(n, w, c, g) for _id, n, w, c, g, _s in DEFAULT_CODE]


def make_pie(*, size: int = 300, stroke: int = 94, slices=PIE_SLICES, center_num: str = "100",
             center_num_size: int = 46, center_size: int = 110,
             show_tags: bool = True, placeholder: bool = False) -> dict:
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

    # Empty-state placeholder: a single faint full ring (no slices, no
    # per-slice tags) sitting behind the center disc — mirrors the
    # zero-value pie on screen 1a · Your Code (Empty) in screens2.html.
    if placeholder:
        container_children.append(
            ellipse(
                x=0, y=0, width=size, height=size,
                fill=T.TRACK,
                inner_radius=inner_ratio,
                opacity=0.55,
                layout_position="absolute",
            )
        )
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


def code_name_header(prefix: str, code_name: str, suffix: str) -> dict:
    """Your-Code headline with the user-given code name set inline in
    brand-green (screens2.html underlines it; pen text is single-fill so we
    convey "this word is the editable code name" with the accent color)."""
    return frame(
        name="scr-hdr",
        width="fill_container",
        padding=[0, 20, 12, 20],
        align="center",
        fill="#00000000",
        children=[
            frame(
                width="hug", gap=0, align="center",
                fill="#00000000",
                children=[
                    text(prefix, size=24, weight="800", color=T.FG_BRIGHT, letter=-0.5),
                    text(code_name, size=24, weight="800", color=T.EMERALD, letter=-0.5),
                    text(suffix, size=24, weight="800", color=T.FG_BRIGHT, letter=-0.5),
                ],
            ),
        ],
    )


def code_slot_row(name: str, pct: int, color: str, glyph: str) -> dict:
    """A slot card on Your Code (Home) — color tile + icon, code name, big
    bold percent, and a remove (minus-circle) button. No category line
    (the latest screens2.html slot-c shows only the name)."""
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
                width=30, height=30, fill=color, corner=9,
                justify="center", align="center",
                children=[mi(glyph, size=18, color="#FFFFFF")],
            ),
            text(name, size=13, weight="700", color=T.FG_BRIGHT,
                 extra={"width": "fill_container"}),
            frame(
                width="hug", gap=1, align="end",
                fill="#00000000",
                children=[
                    text(str(pct), size=18, weight="800", color=T.FG_BRIGHT, letter=-0.4),
                    text("%", size=11, weight="700", color=T.FG_MUTED),
                ],
            ),
            frame(
                width=26, height=26, fill="#00000000", corner=999,
                justify="center", align="center",
                children=[mi("do_not_disturb_on", size=22, color=T.FG_FAINT)],
            ),
        ],
    )


def rebalance_pill() -> dict:
    """Top-right pill on the pie card: tune icon + "Rebalance"."""
    return frame(
        layout_position="absolute",
        x=224, y=12,
        width="hug",
        height=24,
        fill=T.SURFACE_2,
        corner=999,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[3, 10, 3, 10],
        gap=4,
        align="center",
        children=[
            mi("tune", size=14, color=T.VIOLET),
            text("Rebalance", size=11, weight="700", color=T.FG_BRIGHT, letter=0.2),
        ],
    )


def chart_toggle(x: int = 12, y: int = 12) -> dict:
    """Small circular icon button that switches the chart type (donut /
    bubble / treemap) — top corner of the pie / score card."""
    return frame(
        layout_position="absolute",
        x=x, y=y,
        width=34, height=34,
        fill=T.SURFACE_2,
        corner=999,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        justify="center", align="center",
        children=[mi("dashboard", size=18, color=T.FG_MUTED)],
    )


def screen_1b_home() -> list:
    """Screen 1b — Your Code (Home), the filled "In Harmony" state.

    A pie-card hero (chart-toggle top-left, Rebalance pill top-right, the
    10-slot donut, Rename/Reset links beneath) over a stack of 10 slot
    rows. The headline carries the editable code name inline."""
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
        children=[
            chart_toggle(),
            rebalance_pill(),
            make_pie(slices=DEFAULT_PIE_SLICES, center_num="100"),
            frame(
                extra={"width": "fill_container"},
                justify="space_between",
                align="center",
                padding=[4, 6, 0, 6],
                fill="#00000000",
                children=[
                    text("Rename", size=11, weight="700", color=T.FG_MUTED, letter=0.2),
                    text("Reset", size=11, weight="700", color=T.FG_MUTED, letter=0.2),
                ],
            ),
        ],
    )

    slot_stack = frame(
        layout="vertical",
        gap=10,
        fill="#00000000",
        extra={"width": "fill_container"},
        children=[code_slot_row(n, w, c, g) for _id, n, w, c, g, _s in DEFAULT_CODE],
    )

    scroll = frame(
        name="scroll",
        width="fill_container",
        height="fill_container",
        fill="#00000000",
        layout="vertical",
        padding=[56, 0, 0, 0],  # status bar safe area
        children=[
            code_name_header("Your ", "In Harmony", " code"),
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

    return [scroll, tabbar(active_index=0, defs=TAB_DEFS_HOME), status_bar_inst()]


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
    """A single priority chip — circular colored icon, percent, name in
    muted text. Fixed width so the row reads as a horizontally-scrollable
    rail (the live code has up to 10 chips)."""
    return frame(
        width=58,
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
                 line_height=1.15, wrap=58),
        ],
    )


def health_bar() -> dict:
    """The color-divided bar painted under each Top Match row. Segment
    widths mirror the live code weights (the default 10-slot mix)."""
    segs = [(w, c) for _id, _n, w, c, _g, _s in DEFAULT_CODE]
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
    # Priorities head row: label + Rebalance button (tune + label)
    prio_head = frame(
        extra={"width": "fill_container"},
        justify="space_between",
        align="end",
        fill="#00000000",
        gap=12,
        children=[
            text("Your priorities", size=11, weight="700",
                 color=T.FG_MUTED, letter=0.4),
            frame(
                width="hug", gap=4, align="center",
                fill="#00000000",
                children=[
                    mi("tune", size=14, color=T.VIOLET),
                    text("Rebalance", size=11, weight="700",
                         color=T.VIOLET, letter=0.4),
                ],
            ),
        ],
    )

    # Priority chips — one per slot in the live code, sorted by descending
    # weight, rendered as a horizontally-scrollable rail (10 chips overflow
    # the screen; the phone clip masks the tail like a swipe rail).
    chip_rail = frame(
        width="hug",
        gap=6,
        align="start",
        fill="#00000000",
        padding=[2, 0, 2, 0],
        children=[
            prio_chip(w, n, c, g)
            for _id, n, w, c, g, _s in sorted(
                DEFAULT_CODE, key=lambda s: s[2], reverse=True
            )
        ],
    )
    chips = frame(
        extra={"width": "fill_container"},
        fill="#00000000",
        clip=True,
        children=[chip_rail],
    )

    # TOP MATCH head: tag + Reevaluate link
    top_match_head = frame(
        extra={"width": "fill_container"},
        justify="space_between",
        align="center",
        fill="#00000000",
        padding=[0, 0, 6, 0],
        children=[
            frame(
                width="hug",
                corner=4,
                fill=T.VIOLET,
                padding=[3, 8, 3, 8],
                children=[
                    text("TOP MATCH", size=9, weight="800", color="#FFFFFF", letter=1.3),
                ],
            ),
            frame(
                width="hug", gap=4, align="center",
                fill="#00000000",
                children=[
                    mi("autorenew", size=14, color=T.VIOLET),
                    text("Reevaluate", size=11, weight="700", color=T.VIOLET, letter=0.2),
                ],
            ),
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
                          children=[top_match_head, featured]),
                    meta_row,
                    rows,
                ],
            ),
        ],
    )

    return [scroll, tabbar(active_index=-1, defs=TAB_DEFS_HOME), status_bar_inst()]


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

    return [scroll, tabbar(active_index=1, defs=TAB_DEFS_HOME), status_bar_inst()]


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
                "avoid, anything. I'll compose a personal code and weight "
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

    return [scroll, tabbar(active_index=2, defs=TAB_DEFS_HOME, violet_glow=True),
            status_bar_inst()]


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
    donut = make_pie(slices=DEFAULT_PIE_SLICES, center_num="94", center_num_size=52)

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
    # Per-slot contribution = weight × salmon score / 100, formatted like
    # the HTML's `raw.toFixed(1)`. Sums to 90; composite = 90 + 4 = 94.
    contrib_data = [
        (n, c, g, w, f"{w * s / 100:.1f}")
        for _id, n, w, c, g, s in DEFAULT_CODE
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
                    text("Total Contribution: 90 of 100", size=11, weight="500",
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
        children=[chart_toggle(x=288, y=14), verdict, donut, contrib_list, contrib_summary],
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

    return [scroll, tabbar(active_index=-1, defs=TAB_DEFS_HOME), status_bar_inst()]


# ─── Onboarding brand mark (screens 0 / 0b) ──────────────────────────────
def intro_brand() -> dict:
    """Centered WISEcode wordmark used at the top of the Intro + Persona
    screens. screens2.html loads a vertical SVG logo; pen can't embed the
    asset, so we approximate it: a rounded brand tile with a sparkle mark
    above a two-tone "WISEcode" wordmark (WISE bright, code brand-green)."""
    return frame(
        name="intro-brand",
        width="fill_container",
        justify="center",
        align="center",
        padding=[0, 0, 6, 0],
        fill="#00000000",
        children=[
            frame(
                layout="vertical",
                align="center",
                gap=8,
                fill="#00000000",
                children=[
                    frame(
                        width=44, height=44, corner=13,
                        fill=T.EMERALD,
                        justify="center", align="center",
                        children=[mi("auto_awesome", size=24, color="#FFFFFF")],
                    ),
                    frame(
                        width="hug", gap=0, align="center",
                        fill="#00000000",
                        children=[
                            text("WISE", size=24, weight="900",
                                 color=T.FG_BRIGHT, letter=-0.6),
                            text("code", size=24, weight="900",
                                 color=T.EMERALD, letter=-0.6),
                        ],
                    ),
                ],
            ),
        ],
    )


def intro_hero(headline: str, body: str) -> dict:
    """Headline + value-prop paragraph block. Pen text nodes are
    single-fill, so the inline emerald accent on "your"/"you" in
    screens2.html is rendered in the primary ink — the copy reads the
    same, just without the colored word."""
    return frame(
        layout="vertical",
        gap=10,
        fill="#00000000",
        extra={"width": "fill_container"},
        children=[
            text(headline, size=27, weight="800", color=T.FG_BRIGHT,
                 letter=-0.6, line_height=1.12, wrap=338),
            text(body, size=14, weight="500", color=T.FG_MUTED,
                 line_height=1.5, wrap=338),
        ],
    )


# ─── Screen 0 — Intro / Welcome ──────────────────────────────────────────
INTRO_TILES = [
    ("tune", "Define your standard",
     "Choose the factors that matter to you and weight them — your values become the score."),
    ("grid_view", "See what truly fits",
     "Foods ranked by your code, not a generic average — so top matches are right for you."),
    ("qr_code_scanner", "Decide in the aisle",
     "Scan any barcode for an instant verdict against your standard — no label-reading required."),
    ("chat_bubble", "Understand the why",
     "Ask WISE AI why a food scores the way it does, and refine your code as you learn."),
    ("autorenew", "Refine as you go",
     "Nudge your weights whenever your priorities shift — every food re-ranks instantly."),
    ("verified", "Grounded in real data",
     "Scores draw on comprehensive nutrition facts, so your standard stays honest."),
]


def intro_tile(glyph: str, title: str, sub: str) -> dict:
    return frame(
        name="intro-tile",
        width=170,
        height=172,
        layout="vertical",
        gap=8,
        fill=T.SURFACE,
        corner=16,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=14,
        children=[
            frame(
                width=34, height=34, corner=10,
                fill=T.SURFACE_2,
                justify="center", align="center",
                children=[mi(glyph, size=20, color=T.VIOLET)],
            ),
            text(title, size=13, weight="700", color=T.FG_BRIGHT),
            text(sub, size=11, weight="500", color=T.FG_MUTED,
                 line_height=1.35, wrap=140),
        ],
    )


def cta_button(label: str, glyph: str = "arrow_forward", *, disabled: bool = False) -> dict:
    """Full-width royal-blue primary CTA with a leading icon. `disabled`
    dims it to the inert state used by the persona screen's footer."""
    return frame(
        name="cta",
        extra={"width": "fill_container"},
        height=50,
        fill=T.VIOLET,
        corner=12,
        padding=[14, 20, 14, 20],
        justify="center", align="center", gap=10,
        opacity=0.45 if disabled else None,
        effect=None if disabled else {
            "type": "shadow", "shadowType": "outer",
            "color": "#1D4ED873",
            "offset": {"x": 0, "y": 8}, "blur": 20, "spread": -8,
        },
        children=[
            mi(glyph, size=18, color="#FFFFFF"),
            text(label, size=15, weight="800", color="#FFFFFF", letter=-0.16),
        ],
    )


def screen_0_intro() -> list:
    """Screen 0 — Intro / Welcome (first-run landing)."""
    carousel = frame(
        name="intro-carousel",
        width="hug",
        gap=12,
        fill="#00000000",
        children=[intro_tile(*t) for t in INTRO_TILES],
    )

    pin_steps = [
        ("ios_share", "Tap the Share icon in your browser bar."),
        ("add_box", "Choose \u201cAdd to Home Screen.\u201d"),
        ("touch_app", "Launch it like any other app — full screen, no browser chrome."),
    ]
    pin_step_rows = [
        frame(
            extra={"width": "fill_container"},
            gap=8, align="center",
            fill="#00000000",
            children=[
                mi(glyph, size=16, color=T.FG_MUTED),
                text(copy, size=12, weight="500", color=T.FG,
                     line_height=1.35, wrap=232),
            ],
        )
        for glyph, copy in pin_steps
    ]
    pin_card = frame(
        name="intro-pin",
        extra={"width": "fill_container"},
        fill=T.SURFACE,
        corner=16,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=14,
        gap=12,
        align="start",
        children=[
            frame(
                width=40, height=40, corner=12,
                fill=T.SURFACE_2,
                justify="center", align="center",
                children=[mi("add_to_home_screen", size=22, color=T.VIOLET)],
            ),
            frame(
                extra={"width": "fill_container"},
                layout="vertical",
                gap=8,
                fill="#00000000",
                children=[
                    text("Pin it to your home screen", size=13, weight="800",
                         color=T.FG_BRIGHT, letter=-0.1),
                    frame(
                        extra={"width": "fill_container"},
                        layout="vertical", gap=6,
                        fill="#00000000",
                        children=pin_step_rows,
                    ),
                    frame(
                        width="hug", gap=2, align="center",
                        fill="#00000000",
                        children=[
                            text("Show me how", size=12, weight="700",
                                 color=T.VIOLET),
                            mi("chevron_right", size=16, color=T.VIOLET),
                        ],
                    ),
                ],
            ),
        ],
    )

    scroll = frame(
        name="scroll",
        width="fill_container",
        height="fill_container",
        fill="#00000000",
        layout="vertical",
        padding=[64, 0, 0, 0],
        children=[
            frame(
                extra={"width": "fill_container"},
                layout="vertical",
                gap=16,
                fill="#00000000",
                padding=[8, 20, 0, 20],
                children=[
                    intro_brand(),
                    intro_hero(
                        "Eat to your code, not the average.",
                        "\u201cHealthy\u201d isn't one-size-fits-all. WISEcode turns what "
                        "you care about into a personal scoring code, then grades every "
                        "food against it — so the right choice is the obvious one.",
                    ),
                ],
            ),
            # Carousel bleeds to the right edge — left-aligned to the 20px
            # gutter, overflowing past the screen clip like a swipe rail.
            frame(
                extra={"width": "fill_container"},
                padding=[16, 0, 0, 20],
                fill="#00000000",
                clip=True,
                children=[
                    frame(
                        extra={"width": "fill_container"},
                        padding=[0, 0, 0, 20],
                        fill="#00000000",
                        children=[carousel],
                    ),
                ],
            ),
            frame(
                extra={"width": "fill_container"},
                layout="vertical",
                gap=14,
                fill="#00000000",
                padding=[16, 20, 0, 20],
                children=[cta_button("Build my code"), pin_card],
            ),
        ],
    )

    return [scroll, tabbar(active_index=-1, defs=TAB_DEFS_HOME), status_bar_inst()]


# ─── Screen 0b — Pick Your Personas ──────────────────────────────────────
PERSONA_CARDS = [
    ("bolt", "The Convenience Seeker",
     "Quick meals, easy prep, clean-ish packaged options."),
    ("public", "The Conscious Consumer",
     "Organic, sustainable, ethical brands, low impact."),
    ("medical_services", "The Condition Manager",
     "Eating to manage specific health conditions (e.g. IBS, diabetes, hypertension)."),
    ("nutrition", "The Clean Eater",
     "Whole foods, minimal processing, ingredient transparency."),
    ("fitness_center", "The Athlete",
     "Performance nutrition, macros, protein-forward choices."),
    ("self_improvement", "The Wellness Devotee",
     "Holistic health, adaptogens, superfoods, functional foods."),
    ("eco", "The Plant-Based Pioneer",
     "Vegan or vegetarian, ethical eating, planet-conscious."),
    ("savings", "The Budget-Smart Shopper",
     "Value-conscious, store brands, best quality per dollar."),
    ("family_restroom", "The Family Guardian",
     "Safe for kids, no artificial additives, family-first choices."),
    ("science", "The Label Scientist",
     "Deep ingredient dives, E-code aware, evidence-based."),
]


def persona_card(glyph: str, title: str, sub: str) -> dict:
    return frame(
        name="persona-card",
        width=204,
        height=188,
        layout="vertical",
        gap=10,
        fill=T.SURFACE,
        corner=16,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=14,
        children=[
            frame(
                extra={"width": "fill_container"},
                justify="space_between",
                align="start",
                fill="#00000000",
                children=[
                    frame(
                        width=38, height=38, corner=11,
                        fill=T.SURFACE_2,
                        justify="center", align="center",
                        children=[mi(glyph, size=22, color=T.VIOLET)],
                    ),
                    frame(
                        width=26, height=26, corner=999,
                        fill="#00000000",
                        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
                        justify="center", align="center",
                        children=[mi("add", size=18, color=T.FG_FAINT)],
                    ),
                ],
            ),
            text(title, size=14, weight="800", color=T.FG_BRIGHT, letter=-0.1),
            text(sub, size=11, weight="500", color=T.FG_MUTED,
                 line_height=1.35, wrap=176),
        ],
    )


def screen_0b_personas() -> list:
    """Screen 0b — Pick Your Personas (multi-select onboarding carousel)."""
    carousel = frame(
        name="persona-carousel",
        width="hug",
        gap=12,
        fill="#00000000",
        children=[persona_card(*p) for p in PERSONA_CARDS],
    )

    skip = frame(
        extra={"width": "fill_container"},
        justify="center", align="center",
        padding=[2, 0, 0, 0],
        fill="#00000000",
        children=[
            text("Skip for now", size=13, weight="700", color=T.FG_MUTED),
        ],
    )

    scroll = frame(
        name="scroll",
        width="fill_container",
        height="fill_container",
        fill="#00000000",
        layout="vertical",
        padding=[64, 0, 0, 0],
        children=[
            frame(
                extra={"width": "fill_container"},
                layout="vertical",
                gap=16,
                fill="#00000000",
                padding=[8, 20, 0, 20],
                children=[
                    intro_brand(),
                    intro_hero(
                        "Which of these sounds like you?",
                        "Pick the food personas that fit — choose as many as you like. "
                        "We'll blend them into your starting WISEcode, then grade every "
                        "food the way you would.",
                    ),
                ],
            ),
            frame(
                extra={"width": "fill_container"},
                padding=[16, 0, 0, 20],
                fill="#00000000",
                clip=True,
                children=[
                    frame(
                        extra={"width": "fill_container"},
                        padding=[0, 0, 0, 20],
                        fill="#00000000",
                        children=[carousel],
                    ),
                ],
            ),
            frame(
                extra={"width": "fill_container"},
                layout="vertical",
                gap=12,
                fill="#00000000",
                padding=[16, 20, 0, 20],
                children=[cta_button("Show me my code", disabled=True), skip],
            ),
        ],
    )

    return [scroll, tabbar(active_index=-1, defs=TAB_DEFS_HOME), status_bar_inst()]


# ─── Screen 1a — Your Code (Empty) ───────────────────────────────────────
def screen_1a_empty() -> list:
    """Screen 1a — Your Code (Empty), the pre-state before any codes are
    added: a zero-value placeholder pie and a single dashed
    "Add your first code" tile."""
    pie_card = frame(
        name="pie-card",
        width="fill_container",
        fill=T.SURFACE,
        corner=24,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[18, 12, 16, 12],
        gap=4,
        layout="vertical",
        align="center",
        children=[
            make_pie(placeholder=True, center_num="0"),
            text("Empty", size=16, weight="800", color=T.FG_BRIGHT, letter=-0.16),
            text("Add codes to compose your code", size=12, weight="500",
                 color=T.FG_MUTED),
        ],
    )

    add_first = frame(
        name="slot-add",
        extra={"width": "fill_container"},
        height=52,
        fill="#00000000",
        corner=14,
        stroke={"thickness": 1, "fill": T.LINE_STRONG, "align": "inside"},
        justify="center", align="center", gap=8,
        children=[
            mi("add", size=20, color=T.VIOLET),
            text("Add your first code", size=14, weight="700", color=T.FG_BRIGHT),
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
            scr_header("Your code"),
            frame(
                width="fill_container",
                layout="vertical",
                gap=16,
                fill="#00000000",
                padding=[0, 20, 0, 20],
                children=[pie_card, add_first],
            ),
        ],
    )

    return [scroll, tabbar(active_index=0, defs=TAB_DEFS_HOME), status_bar_inst()]


# ─── Screen 7 — Settings ─────────────────────────────────────────────────
def seg_opt(label: str, glyph: str | None, active: bool) -> dict:
    """One option in a settings segmented control."""
    children: list = []
    on_color = "#FFFFFF" if active else T.FG_MUTED
    if glyph:
        children.append(mi(glyph, size=14, color=on_color))
    children.append(text(label, size=11, weight="700", color=on_color))
    return frame(
        width="hug",
        fill=T.VIOLET if active else "#00000000",
        corner=999,
        padding=[5, 10, 5, 10],
        gap=4,
        align="center",
        children=children,
    )


def theme_seg(opts: list) -> dict:
    """Segmented pill (e.g. Dark | Light) for a settings row trailing slot.
    `opts` is a list of (label, glyph, active) tuples."""
    return frame(
        width="hug",
        fill=T.SURFACE_2,
        corner=999,
        stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=3,
        gap=2,
        align="center",
        children=[seg_opt(*o) for o in opts],
    )


def trail_button(label: str, *, solid: bool = False) -> dict:
    """Ghost / solid trailing pill button for an account-style row."""
    return frame(
        width="hug",
        fill=T.VIOLET if solid else "#00000000",
        corner=999,
        stroke=None if solid else {"thickness": 1, "fill": T.LINE, "align": "inside"},
        padding=[7, 13, 7, 13],
        justify="center", align="center",
        children=[
            text(label, size=12, weight="700",
                 color="#FFFFFF" if solid else T.FG_BRIGHT),
        ],
    )


def set_row(glyph: str, glyph_color: str, title: str, sub: str, trailing: dict) -> dict:
    return frame(
        name="set-row",
        extra={"width": "fill_container"},
        gap=12,
        align="center",
        fill="#00000000",
        padding=[12, 14, 12, 14],
        children=[
            frame(
                width=36, height=36, corner=10,
                fill=T.SURFACE_2,
                justify="center", align="center",
                children=[mi(glyph, size=20, color=glyph_color)],
            ),
            frame(
                extra={"width": "fill_container"},
                layout="vertical", gap=2,
                fill="#00000000",
                children=[
                    text(title, size=14, weight="700", color=T.FG_BRIGHT),
                    text(sub, size=11, weight="500", color=T.FG_MUTED,
                         line_height=1.3, wrap=176),
                ],
            ),
            trailing,
        ],
    )


def set_section(label: str, rows: list) -> dict:
    """A labelled settings group: an eyebrow label over a surface card whose
    rows are separated by hairline dividers."""
    group_children: list = []
    for i, row in enumerate(rows):
        group_children.append(row)
        if i < len(rows) - 1:
            group_children.append(
                rect(width="fill_container", height=1, fill=T.LINE_SUBTLE)
            )
    return frame(
        extra={"width": "fill_container"},
        layout="vertical",
        gap=8,
        fill="#00000000",
        children=[
            text(label.upper(), size=10, weight="800", color=T.FG_MUTED,
                 letter=1.2, extra={"padding": [0, 4, 0, 4]}),
            frame(
                name="set-group",
                extra={"width": "fill_container"},
                layout="vertical",
                fill=T.SURFACE,
                corner=16,
                stroke={"thickness": 1, "fill": T.LINE, "align": "inside"},
                children=group_children,
            ),
        ],
    )


def screen_8_settings() -> list:
    """Screen 7 — Settings (optional). Appearance / Account / Location /
    Share sections, reached from the far-right SETTINGS tab."""
    appearance = set_section("Appearance", [
        set_row("contrast", T.VIOLET, "Theme",
                "Switch between light and dark mode.",
                theme_seg([("Dark", "dark_mode", True), ("Light", "light_mode", False)])),
        set_row("visibility", T.VIOLET, "Color vision",
                "Switch scores to a color-blind-safe palette.",
                theme_seg([("Default", None, True), ("Color-safe", "contrast", False)])),
    ])
    account = set_section("Account", [
        set_row("login", T.VIOLET, "Log in",
                "Sync your code across devices.",
                trail_button("Log in")),
        set_row("person_add", T.VIOLET, "Create account",
                "Save your code and pick up anywhere.",
                trail_button("Sign up", solid=True)),
    ])
    location = set_section("Location", [
        set_row("location_on", T.VIOLET, "Share location",
                "Surface stores and picks near you.",
                trail_button("Allow")),
    ])
    share = set_section("Share", [
        set_row("ios_share", T.VIOLET, "Share the app",
                "Send Personalized Nutrition to a friend.",
                mi("chevron_right", size=20, color=T.FG_FAINT)),
    ])

    scroll = frame(
        name="scroll",
        width="fill_container",
        height="fill_container",
        fill="#00000000",
        layout="vertical",
        padding=[56, 0, 0, 0],
        children=[
            scr_header("Settings"),
            frame(
                extra={"width": "fill_container"},
                layout="vertical",
                gap=18,
                fill="#00000000",
                padding=[0, 20, 0, 20],
                children=[appearance, account, location, share],
            ),
        ],
    )

    return [scroll, tabbar(active_index=3, defs=TAB_DEFS_HOME), status_bar_inst()]


# ─── Assemble ────────────────────────────────────────────────────────────
def build() -> dict:
    """Build the root .pen dict.

    Layout: 10 screens × 2 themes = 20 phones, arranged as a 10-column ×
    2-row grid. Each column is one screen; the top row is the dark
    variant, the bottom row is the light variant. A per-column header
    sits above the dark phone with the screen index and name. This
    mirrors screens2.html's `.screen-pair` / `.pair-row` structure:
    same screen rendered twice side-by-side, swipe-able horizontally.

    Component bootstrap:
      1. Build the dark StatusBar + PhoneFrame components.
      2. Spawn the light StatusBar + PhoneFrame by deep-cloning the
         dark trees (fresh ids) and running `recolor_for_light()`.
      3. Each screen builder (always authored against `T` dark tokens)
         is invoked once to produce the dark phone, then its children
         are deep-cloned, recolored, and statusbar-refs relinked to
         build the light phone."""
    # ─── 1. Dark components ──────────────────────────────────────────
    sb_dark = make_statusbar()
    StatusBar.dark_id = sb_dark["id"]
    StatusBar._id = sb_dark["id"]  # back-compat alias
    pf_dark = make_phoneframe()
    PhoneFrame.dark_id = pf_dark["id"]
    PhoneFrame.dark_slot = PhoneFrame._screen_slot_id

    # ─── 2. Light components (cloned + recolored from dark) ──────────
    sb_light = deep_clone_with_new_ids(sb_dark)
    recolor_for_light(sb_light)
    sb_light["name"] = "component/StatusBar — Light"
    sb_light["y"] = 200  # park slightly below the dark one off-canvas
    StatusBar.light_id = sb_light["id"]

    pf_light = deep_clone_with_new_ids(pf_dark)
    recolor_for_light(pf_light)
    pf_light["name"] = "component/PhoneFrame — Light"
    pf_light["y"] = 900  # park below dark
    PhoneFrame.light_id = pf_light["id"]
    light_screen_node = find_node_by_name(pf_light, "screen")
    assert light_screen_node is not None, "light phone-frame missing screen slot"
    PhoneFrame.light_slot = light_screen_node["id"]

    # ─── 3. Screen specs ─────────────────────────────────────────────
    # Mirrors the screen-pair lineup in the latest screens2.html (the
    # DS · Design System foundations board is excluded — it's a wide
    # reference board, not a phone screen).
    phone_specs = [
        ("0 · Intro / Welcome",      screen_0_intro),
        ("0b · Pick Your Personas",  screen_0b_personas),
        ("1a · Your Code (Empty)",   screen_1a_empty),
        ("1b · Your Code (Home)",    screen_1b_home),
        ("2 · Add Code (Pick)",      screen_2_pick),
        ("3 · Browse (Top Matches)", screen_3_browse),
        ("4 · Scan (Find a Food)",   screen_4_scan),
        ("5 · Chat",                 screen_5_chat),
        ("6 · Food Detail",          screen_7_food_detail),
        ("7 · Settings",             screen_8_settings),
    ]

    # ─── 4. Layout geometry ──────────────────────────────────────────
    phone_w, phone_h = 390, 844
    side_pad, top_pad = 64, 80
    col_gap = 56          # matches `.pair-rail { gap: 56px }` in screens2.html
    label_h = 30          # column title strip
    label_gap = 18        # title → dark phone
    row_gap = 56          # dark → light vertically
    bottom_pad = 96

    cols = len(phone_specs)
    stage_w = side_pad * 2 + cols * phone_w + (cols - 1) * col_gap
    stage_h = (
        top_pad + label_h + label_gap
        + phone_h + row_gap + phone_h
        + bottom_pad
    )

    # ─── 5. Build phones + labels per column ─────────────────────────
    stage_children: list = []

    # Stage ambient washes (mirror .stage radial gradients in HTML)
    stage_children.append(
        ellipse(
            x=-200, y=-200, width=900, height=900, opacity=0.6,
            fill={
                "type": "gradient", "gradientType": "radial", "enabled": True,
                "rotation": 0, "size": {"width": 1, "height": 1},
                "colors": [
                    {"color": "#1FA34A2E", "position": 0},
                    {"color": "#05141C00", "position": 1},
                ],
            },
        )
    )
    stage_children.append(
        ellipse(
            x=stage_w - 700, y=stage_h - 700, width=900, height=900, opacity=0.6,
            fill={
                "type": "gradient", "gradientType": "radial", "enabled": True,
                "rotation": 0, "size": {"width": 1, "height": 1},
                "colors": [
                    {"color": "#1D4ED829", "position": 0},
                    {"color": "#05141C00", "position": 1},
                ],
            },
        )
    )

    y_label = top_pad
    y_dark = top_pad + label_h + label_gap
    y_light = y_dark + phone_h + row_gap

    for i, (title, builder) in enumerate(phone_specs):
        x = side_pad + i * (phone_w + col_gap)

        # Column header — matches `.screen-pair-label` in screens2.html
        stage_children.append(
            text(
                title,
                size=18,
                weight="800",
                color=T.FG_BRIGHT,
                letter=-0.2,
                x=x,
                y=y_label,
                width=phone_w,
                align="center",
                name=f"label/{title}",
            )
        )

        # Dark variant — the canonical build path
        dark_children = builder()
        stage_children.append(
            phone(
                screen_children=dark_children,
                x=x,
                y=y_dark,
                name=f"Dark — {title}",
                theme="dark",
            )
        )

        # Light variant — clone, recolor, relink statusbar refs
        light_children = [deep_clone_with_new_ids(c) for c in dark_children]
        for c in light_children:
            recolor_for_light(c)
            relink_refs(c, {StatusBar.dark_id: StatusBar.light_id})
        stage_children.append(
            phone(
                screen_children=light_children,
                x=x,
                y=y_light,
                name=f"Light — {title}",
                theme="light",
            )
        )

    # ─── 6. Demo stage frame ─────────────────────────────────────────
    stage = frame(
        name="Demo Stage — 10 screens × dark + light",
        x=0,
        y=0,
        width=stage_w,
        height=stage_h,
        fill={
            "type": "gradient", "gradientType": "linear",
            "enabled": True, "rotation": 180,
            "size": {"height": 1},
            "colors": [
                {"color": T.BG, "position": 0},
                {"color": T.SURFACE, "position": 0.5},
                {"color": T.BG, "position": 1},
            ],
        },
        layout="none",
        clip=True,
        children=stage_children,
    )

    root = {
        "version": "2.11",
        "children": [pf_dark, sb_dark, pf_light, sb_light, stage],
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
