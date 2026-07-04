# Vercel front-door for Rivet × Crewline

The app itself is one Node process deployed on Render (see ../render.yaml).
This folder is a zero-build Vercel project that proxies every request to the
Render backend, so the site is also reachable on a *.vercel.app domain.

Deploy (one time):

    npm i -g vercel        # if not installed
    vercel login
    cd vercel-proxy
    vercel --prod --yes

Every request to the Vercel URL is rewritten server-side to
https://rivet-crewline.onrender.com — cookies, logins, and POSTs all pass
through. The backend prefers the `x-forwarded-host` header, so OAuth
callbacks and absolute links keep the Vercel domain.

If the Render URL ever changes, update `destination` in vercel.json and
re-run `vercel --prod`.
