# Namecheap frontend deployment

Build the public and Admin packages separately. Upload the **contents** of each `dist`
folder to that site's document root, including the hidden `.htaccess` file beside
`index.html`. Vite copies it from `public/.htaccess` on every build. In cPanel File
Manager enable **Settings > Show Hidden Files (dotfiles)** to see it.

The rewrite serves `index.html` for React routes, preserving query parameters used
by email verification and payment callbacks. Existing files and directories are
served normally, and missing API or asset paths remain errors. Do not install the
Admin build inside the public site's document root unless it has a separate virtual host.

If a document root already has `.htaccess`, back it up and merge these routing rules
with required host settings; avoid an earlier rule that returns 404 or redirects deep
links to `/`. Apache/LiteSpeed must permit `mod_rewrite` rules through `AllowOverride`.

After upload check `/admin/login`, `/admin/dashboard`, `/registration/verify-email`,
`/registration/payment/callback`, and other application routes by opening them directly
and refreshing. Verification pages without real tokens should show a validation message,
not a hosting 404. Use browser Back/Forward after navigating between pages.
