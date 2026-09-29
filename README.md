# SolarShield Mobile Tinting Website 🚗✨

A high-performance, mobile-first showcase website built for **SolarShield Mobile Tinting** (serving Hernando, Pasco, and Citrus Counties in Florida).

Faithfully created from the official brand rendering, featuring custom high-conversion CTAs, an interactive tint shade simulator, mobile call/text actions, and full responsiveness.

---

## ⚡ Quick Start (No Setup Required!)

You can open and view this website right now:
1. Open this folder: `solar-shield-tinting`
2. **Double-click `index.html`** in any web browser (Chrome, Safari, Edge, Firefox).
3. That's it! Everything works immediately with zero installation.

---

## 🚀 How Your Friend Can Launch It Online (100% Free)

### Option 1: Cloudflare Pages (Fastest - 2 Minutes)
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com/) and create a free account.
2. Click **Create Application** > **Pages** > **Direct Upload**.
3. Drag and drop this entire `solar-shield-tinting` folder into the upload box.
4. Click **Deploy Site**.
5. Your site is immediately live at `https://solarshield-tinting.pages.dev` with a free SSL certificate!
6. (Optional) Connect your own domain name (e.g. `solarshieldmobiletinting.com`) under **Custom Domains**.

### Option 2: GitHub + Cloudflare Pages (Automatic Updates)
1. Create a new repository on GitHub: `solarshield-tinting`.
2. Push these files to GitHub.
3. In Cloudflare Pages, select **Connect to Git** and choose the repository.
4. Every time you push a photo or update text, Cloudflare will automatically rebuild and update the site within seconds!

---

## 📧 How to Connect the Quote Form Directly to Your Phone / Email

The form is already wired with fields for **Name**, **Phone**, **Service Needed**, **Vehicle / Property Details**, and **Additional Notes**.

To receive quote submissions straight to `solarshieldmobiletinting@gmail.com` with zero code:
1. Go to [Web3Forms](https://web3forms.com/) (free) and enter `solarshieldmobiletinting@gmail.com` to get an Access Key.
2. In [index.html](file:///c:/Users/forre/Downloads/solar-shield-tinting/index.html), find the `<form id="quote-form">` and add:
   ```html
   <input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY_HERE">
   ```
   Or use [Formspree](https://formspree.io/) simply by setting the form `action="https://formspree.io/f/YOUR_FORM_ID"`.

---

## 📂 Project Structure

```text
solar-shield-tinting/
├── index.html                    # Main website (Tailwind CSS, fonts, interactive simulator)
├── README.md                     # Launch instructions & documentation
├── package.json                  # Optional dev scripts (Vite / local server)
└── images/
    ├── hero_logo.png             # SolarShield logo badge
    ├── hero_truck.png            # Lifted white Ford F-150 hero visual
    ├── service_auto.png          # Automotive tint card photo
    ├── service_res.png           # Residential home tint card photo
    ├── service_comm.png          # Commercial building tint card photo
    ├── recent_work_1.png         # Gallery: Truck ceramic tint
    ├── recent_work_2.png         # Gallery: SUV heat shield
    ├── recent_work_3.png         # Gallery: Residential glass patio
    ├── recent_work_4.png         # Gallery: Commercial fleet van
    └── service_map.png           # Tri-county Florida service area map
```

---

## 🛠️ Features Included

- **Exact Brand Aesthetic**: Electric racing yellow (`#FFD000`), deep cobalt blue (`#0D62D9`), and aggressive slant typography (`Barlow Condensed`).
- **Mobile First Conversion**: Sticky bottom bar on mobile with 1-tap **Call Now**, **Text Us**, and **Get Quote**.
- **Interactive Tint Shade Simulator**: Lets customers test 5% (Limo), 15% (Dark), 20% (Factory Match), 35% (FL Legal Front), 50% (Light), and 70% (Clear Ceramic) before asking for a quote.
- **Service Area Showcase**: Highlighted coverage for Hernando, Pasco, and Citrus Counties with glowing map integration.
- **Lightbox Gallery**: Click any recent work photo to view enlarged in high definition.
- **Lifetime Warranty & Trust Badges**: 15 Years in the industry, Quality Film, Lifetime Warranty, and Personal Touch competitive pricing.
