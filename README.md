# pusto.sh

An image-only landing page for [pusto.sh](https://pusto.sh), hosted on GitHub Pages. Plain HTML and CSS, with no build step or JavaScript.

## Preview

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. The image fills the viewport; `object-position` in `index.html` keeps the circle visible when portrait screens crop the sides.
