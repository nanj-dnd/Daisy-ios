# Daisy's type

The approved C direction uses Fraunces for the Daisy wordmark, home deck names,
collection headings and archive pack names. DM Sans carries supporting copy,
counts and shared controls. Game-specific lettering and puzzle glyphs retain
their existing fonts. Native segmented controls retain their system typography.

Both files are bundled for offline use and loaded through Expo Font. They retain
their variable weight axes, so real weight selection works with `fontWeight`.
Only these two assets are added to the existing game fonts (404,140 bytes).

- `DM-Sans.ttf`: Google Fonts `ofl/dmsans/DMSans[opsz,wght].ttf`.
- `Fraunces-Soft.ttf`: Google Fonts
  `ofl/fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf`, with optical size 32,
  softness 70 and wonky 1 pinned to preserve the selected preview's soft shapes.
  Its weight axis remains variable, with a default of 700.

Sources: <https://github.com/google/fonts/tree/main/ofl/dmsans> and
<https://github.com/google/fonts/tree/main/ofl/fraunces>, retrieved 2026-11-08.
Their SIL Open Font Licenses are included alongside the assets.

To reproduce the Fraunces instance with fontTools (build-time tooling only):

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

font = TTFont('Fraunces[SOFT,WONK,opsz,wght].ttf')
font = instantiateVariableFont(font, {
    'opsz': 32, 'SOFT': 70, 'WONK': 1, 'wght': (100, 700, 900),
}, inplace=True)
font.save('Fraunces-Soft.ttf')
```
