# Ranil Fernando Hugo Blog

Professional Hugo-based personal blog for `https://blog.ranilfernando.com`.

## Local preview

```bash
hugo server -D
```

Open:

```text
http://localhost:1313
```

## Add a new blog post

```bash
hugo new content posts/my-new-post.md
```

Then edit the Markdown file under `content/posts/`.

## GitHub Pages setup

1. Create repository: `ranilfernando.github.io`
2. Push this project to the `main` branch.
3. Go to **Settings > Pages**.
4. Source: **GitHub Actions**.
5. Custom domain: `blog.ranilfernando.com`.
6. Enable **Enforce HTTPS** after DNS validates.

## DNS setup

Add this DNS record where your domain is hosted:

```text
Type: CNAME
Name: blog
Value: ranilfernando.github.io
TTL: Auto
```

## Publish workflow

```text
Write Markdown → Git commit → Git push → GitHub Actions → GitHub Pages
```
