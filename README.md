# Raymond Shop - Tailoring POS - White & Solid Red #CC0000

## Features
- Dashboard: Big + button -> New Order / Sale Products
- Order Slip: Slip No #1, #2... starting from 1
- Daily Presents: Attendance with Present/Absent, auto reset 11:59:59 PM, weekly/monthly/yearly history
- Customers: Auto from orders
- Portal: Staff List + Products
- Settings: Shop info + Logo upload to img/ + Firebase Live Sync

## Currency: BDT ৳

## Folders
- index.html (main)
- css/style.css (all styles)
- js/app.js (all logic)
- img/ (upload images here - logo.png, products)
- database/ (optional json)

## GitHub Pages Deploy
1. Delete old files in cygmaa/raymond repo
2. Upload all files from this zip (keep folder structure)
3. Settings > Pages > Branch: main / root > Save
4. Live at https://cygmaa.github.io/raymond/

## Image Upload Permission
- Portal > Products > Product Image Upload
- Settings > Logo upload
- Both allow image/* upload. Image saves to browser + you can download and move to img/ folder for permanent.
- For GitHub Pages permanent: Add images to img/ folder and push.

## Firebase Setup for Live Data
1. Go to console.firebase.google.com
2. Create project > Firestore Database > Create database (Test mode)
3. Project Settings > Your apps > Web > Copy config
4. In app Settings > Paste apiKey, authDomain, projectId, etc > Save & Connect
5. Now all devices see same data live!

Without Firebase: Data stays in localStorage (single browser only)
