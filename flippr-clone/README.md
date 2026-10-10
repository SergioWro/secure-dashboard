# Flip Scanner

Mobile-first web app, similar in idea to Flippr: photo of a shelf, items identified, price looked up, flip score per item.

## Run
    cd flippr-clone && cp .env.example .env && npm install
    set -a; . ./.env; set +a; npm start   # http://localhost:3100

Works in demo mode with no keys (fake items, fake prices).

## How it works
- Bulk scan: up to 20 items per photo.
- `lib/identify.js`: sends the photo to Claude vision, gets a JSON list of titles.
- `lib/pricing.js`: eBay Browse API, median of ACTIVE listings (USD).
- `lib/score.js`: profit = price - ~13.25% fee - $3.99 shipping. Score 1-10 from profit and demand.
- Inventory lives in the browser (localStorage). CSV export included.

## Limits (honest)
- Sold prices and real sell-through need eBay Marketplace Insights API, which eBay restricts. Active listings are asking prices, so they overstate value. Score demand is a neutral 15/30 until you plug in sold data.
- No eBay auto-listing, no barcode scan, no accounts, no Amazon data.
- Vision can misread titles. Check the list before relying on it.
