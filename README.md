# Ranil Fernando Hugo Blog

This is a clean Hugo website configured for GitHub Pages and the custom domain:

https://blog.ranilfernando.com

## Important GitHub Pages setting

Go to repository Settings > Pages and set:

- Source: GitHub Actions

Do not use "Deploy from branch" for this Hugo setup.

## Required DNS record

At your DNS provider, keep this CNAME record:

- Type: CNAME
- Name: blog
- Value: ranilfernando.github.io

## Add a new post

Create a new Markdown file under:

content/posts/

Example:

content/posts/my-new-post.md
