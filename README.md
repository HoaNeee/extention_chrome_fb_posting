# This is Posting Simulator Many Groups for facebook

If you need script watch change to build a one file script (Ex: content.js), run command

```bash
npx esbuild dist/content/content-src.js --bundle --outfile=dist/content/content.js --watch
npx esbuild dist/utils/gm-compat-src.js --bundle --outfile=dist/utils/gm-compat.js --watch
```

And this is how to host script:

```bash
//you can go to http://localhost:3000/content.js
npx serve dist
```
