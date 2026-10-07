# pusto.sh

An SVG landscape for [pusto.sh](https://pusto.sh), hosted on GitHub Pages. Click or tap the brushstroke circle to send waves of color through the sky. Keyboard activation works with Enter or Space; reduced motion uses a gentle glow.

## Preview

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. No build step or runtime dependencies.

`index.html` draws the sky and hills; `scene.css` keeps the scene and button aligned across screen sizes; `scene.js` handles the light pulses. The circle is traced from the original artwork, with a small procedural SVG texture. The original PNG and WebP remain in `assets/` as references and are not loaded by the scene.
