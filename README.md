# pusto.sh

An image-only landing page for [pusto.sh](https://pusto.sh), hosted on GitHub Pages. Plain HTML and CSS, with no build step or JavaScript.

## Preview

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. The image fills the viewport; `object-position` in `index.html` keeps the circle visible when portrait screens crop the sides.

## Artwork

`assets/pustosh.png` is the original, unchanged 1536 × 1024 image supplied by the owner. Browsers load `assets/pustosh.webp`, with PNG as a fallback and social preview.

| File | Bytes |
| --- | ---: |
| Original PNG | 1,398,535 |
| Lossless WebP | 755,010 |

The WebP is 46.01% smaller. All 1,572,864 decoded pixels were compared against the original: zero changed color channels. There is no resizing, quantization, near-lossless preprocessing, or chroma subsampling.

To reproduce the WebP with `cwebp`:

```sh
cwebp -lossless -q 100 -m 6 -exact -metadata all assets/pustosh.png -o assets/pustosh.webp
```

The original PNG SHA-256 is `2b82da16d2818aee1c21ad879aed0ee17b004daafc3cdfec03be9b37cfdcaf87`.

## GitHub Pages

Publish the `main` branch from `/ (root)`. `.nojekyll` disables Jekyll; `CNAME` sets the custom domain to `pusto.sh`.

At the DNS provider, set these `A` records for the root domain (`@`), replacing its existing parking records:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

If `www.pusto.sh` should work too, set its `CNAME` to `pusto-sh.github.io` instead of the parking target. Preserve unrelated DNS records, including email and verification records.

Once DNS resolves and GitHub has issued the certificate, enable **Enforce HTTPS** in the repository's Pages settings.

See [GitHub's custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
