# pusto.sh

Static landing page for [pusto.sh](https://pusto.sh), hosted on GitHub Pages with the custom domain in `CNAME`. No build step or runtime dependencies.

## Preview

```sh
python3 -m http.server 8001 --bind 127.0.0.1
```

Open http://localhost:8001. WebGPU requires localhost or HTTPS.

Use `?renderer=webgl2` or `?renderer=svg` to force a fallback. `main[data-renderer]` identifies the active GPU backend; the attribute is absent in SVG mode.

## Files

- `index.html`: metadata, SVG fallback, circle button, and startup visibility gate.
- `scene.css`: layout, coordinate alignment, and mobile Safari viewport bleed.
- `scene.js`: startup, Safari scroll offset, and SVG interaction.
- `atmosphere.js`: input, animation state, resizing, adaptive resolution, and renderer recovery.
- `renderers/webgpu.js` and `shaders/*.wgsl`: floating-point scene rendering, two-pass bloom, and compositing.
- `renderers/webgl.js` and `shaders/fallback.frag`: single-pass WebGL2 fallback.
- `assets/circle.svg`: fallback brushstroke and GPU texture mask. `assets/pustosh.png` supplies the Open Graph image.

## Maintenance

- Keep WGSL, GLSL, and SVG geometry aligned in the 1536 × 1024 coordinate system. Keep the 128-byte uniform layout synchronized between `atmosphere.js` and both GPU backends.
- The scene fits the viewport width with independent x/y scales in `view.zw`. Sky textures, brush, and waves use uniform scaling, capped at 1.5 times the horizontal scene scale; keep the CSS button bounds aligned with that mapping.
- The `v` query on `scene.js` propagates to renderer modules and shaders. Bump the script and stylesheet revisions in `index.html` when their interfaces or layout change. Shader requests revalidate cached content.
- Hill contours, wash boundaries, and ground grain stay fixed. Ground animation changes density and illumination only. Refraction excludes the terrain and brush mask; the scene alpha channel masks bloom and chromatic separation off the ground.
- Startup reveals the GPU canvas after its first frame. Initialization or graphics failures fall back from WebGPU to WebGL2 to SVG. Forced colors and JavaScript-disabled browsers use SVG directly.
- Reduced motion freezes ambient animation, disables expanding waves and the startup fade, and stops rendering at rest. Hidden tabs pause rendering.
- Check click/tap, hold/release, Enter/Space, reduced motion, renderer fallbacks, and mobile Safari browser controls after relevant changes.
