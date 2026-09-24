# RaymondShop - Cloudflare Ready Version

## What changed from portable version?

REMOVED:
- ❌ Connect Folder permission system (File System Access API)
- ❌ Auto backup to database/raymond_backup.json every 10s (local folder)
- ❌ Auto save to img/ folder via browser API
- ❌ All Images (img/) dynamic gallery

ADDED / KEPT:
- ✅ img/ folder exists in project - for permanent deployment
- ✅ All data saved in IndexedDB + localStorage (browser)
- ✅ Logo upload with download option to add to img/ folder for permanent visibility
- ✅ Sharp corners, #2e1414 menu hover, #CC0000 solid red buttons
- ✅ Compact menus, English, Admin menu
- ✅ Custom themed popups (no browser default)

## Structure

```
RaymondShop-Cloudflare/
├── index.html              <- No Connect Folder button, Cloudflare Ready badge
├── css/style.css
├── js/app.js               <- Single file, no file system API
├── database/
│   └── raymond_backup.json <- Empty fresh
├── img/
│   ├── README.md
│   ├── raymond-logo.png    <- PUT YOUR LOGO HERE for permanent visibility
│   └── raymond-logo-placeholder.svg
└── README.md
```

## How to deploy to Cloudflare Pages

### Method 1: Drag & Drop (Easiest)
1. Go to https://dash.cloudflare.com > Pages > Create a project > Direct Upload
2. Drag and drop this entire folder (or zip)
3. Your site will be live: https://raymondshop-xxxxx.pages.dev

### Method 2: GitHub
1. Create GitHub repo, push this folder
2. Cloudflare Pages > Create > Connect to Git > Select repo
3. Build settings: Framework preset = None, Build command = (empty), Output directory = /
4. Deploy

## How to make logo permanent for all devices

Problem: If you upload logo on one phone, other phones won't see it because data is in browser storage.

Solution:
1. On your PC, open the deployed site or local index.html
2. Go to Admin > Upload Logo > Upload your Raymond PNG
3. Click "Download Logo for img/ folder" - saves as raymond-logo.png
4. Put that file into img/raymond-logo.png in your project folder (replace placeholder)
5. Redeploy to Cloudflare Pages (drag & drop again or git push)
6. Now ALL devices will see logo from img/raymond-logo.png - permanent!

Same for any product images you want permanent - add to img/ folder and redeploy.

## For local business use

Even though this is Cloudflare ready, you can still double-click index.html and use offline - no server needed. Data stays in browser.

For portable use with auto backup to folder, use the previous version with Connect Folder.

## Why img/ folder needed?

If img/ folder doesn't exist, uploaded images stored only in browser IndexedDB - other mobiles/computers visiting the link won't see them. By putting images in img/ folder and redeploying, they become part of the site and visible everywhere.

This is how static hosting works - no backend, so permanent files must be in deployment.
