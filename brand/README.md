# Apna Okara brand

| File | Use |
|---|---|
| `logo.svg` | English logo (website header, documents) |
| `logo-urdu.svg` | Urdu logo |
| `app-icon.svg` / `app-icon.png` | App icon (1024x1024), WhatsApp group DP, Facebook profile picture |
| `og-image.png` | Link preview image when the site is shared on WhatsApp / Facebook (1200x630) |
| `facebook-cover.png` | Facebook page cover (1640x624) |

PNG files are generated from code: `npm run images` (see `scripts/make-images.mjs`).

**Logo idea:** a green location pin (local, "apna") with a small orange shopping basket inside (bazaar).

**Colours**

| Name | Hex | Use |
|---|---|---|
| Green | `#15803D` | Primary: logo, buttons, links |
| Dark green | `#166534` / footer `#14532D` | Hover, footer |
| Light green | `#DCFCE7` | Icon backgrounds |
| Orange | `#C2410C` | "Post Ad" button, Featured badge (white text) |
| Bright orange | `#F97316` | Icons and decoration only |
| Text | `#1F2937` | Body text |
| Muted text | `#4B5563` | Secondary text |
| Page | `#F9FAFB` | Background |

**Fonts:** Inter (English), Noto Nastaliq Urdu (Urdu).
## Social media posts (`social/posts/`)

Six ready posts, 1080x1080, for Instagram, Facebook and WhatsApp. Each one comes in Urdu
(`urdu/post-N-ur.png`) and English (`english/post-N-en.png`).

| # | Post |
|---|---|
| 1 | Launch: "Apna Okara is now online" (photo collage) |
| 2 | How to post an ad in 2 minutes |
| 3 | Find service providers (electrician, plumber, AC, mechanic, tutor, driver) |
| 4 | 5 rules for safe buying and selling |
| 5 | Rishta: respect and privacy |
| 6 | Follow the WhatsApp channel |

Photos are free Pexels photos (commercial use allowed, no credit needed). The ads shown on the
phone in post 6 are examples only.

To change a post, edit `social/posts/source/posts.html`, then make the picture again with Edge or Chrome:

```
msedge --headless=new --hide-scrollbars --window-size=1080,1080 --virtual-time-budget=5000 --screenshot=post.png "file:///D:/Project/Apna%20Okara/brand/social/posts/source/posts.html?n=1&lang=ur"
```

`n` = post number (1-6), `lang` = `ur` or `en`.
