#!/usr/bin/env python3
"""
Extract product data from all PDF price lists and output JSON for MongoDB import.
Handles: TP-Link, Megatop (Hikvision cameras), Hikvision Intercom, Racks, Sound System.
"""

import fitz  # PyMuPDF
import json
import re
import os

OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "products_data.json")


def clean_price(price_str):
    """Extract numeric price from string like 'EGP 13,584.91' or '13584.91'."""
    if not price_str:
        return None
    # Remove currency symbols, commas, whitespace
    cleaned = re.sub(r'[^\d.]', '', str(price_str).replace(',', ''))
    try:
        return round(float(cleaned), 2)
    except (ValueError, TypeError):
        return None


def extract_tplink(filepath):
    """Extract TP-Link products — well-structured tables with Model, Description, Price."""
    doc = fitz.open(filepath)
    products = []
    current_category = "Networking"
    current_subcategory = ""

    for page_num in range(doc.page_count):
        page = doc[page_num]
        tables = page.find_tables()
        if not tables or not tables.tables:
            continue

        for table in tables.tables:
            rows = table.extract()
            for row in rows:
                if not row or len(row) < 3:
                    continue

                model = str(row[0]).strip() if row[0] else ""
                description = str(row[1]).strip() if row[1] else ""
                price_str = str(row[2]).strip() if row[2] else ""

                # Skip header rows
                if model.lower() in ("model no.", "model", ""):
                    continue

                # Detect category headers (no price, used as section dividers)
                price = clean_price(price_str)
                if not price and model and not description:
                    current_subcategory = model
                    continue
                if not price:
                    if model and description == "":
                        current_subcategory = model
                    continue

                # Extract features from description
                features = []
                desc_lines = description.split('\n')
                main_desc = desc_lines[0] if desc_lines else description
                for line in desc_lines:
                    line = line.strip()
                    if line.startswith("SPEED:") or line.startswith("SPEC:") or line.startswith("FEATURE:") or line.startswith("SEPC:"):
                        features.append(line)

                products.append({
                    "name": f"TP-Link {model}",
                    "model": model,
                    "description": main_desc,
                    "price": price,
                    "brand": "TP-Link",
                    "category": current_subcategory or "Networking",
                    "parentCategory": "Networking",
                    "features": features,
                    "stock": 50,  # Default stock
                    "tags": ["tp-link", "networking", current_subcategory.lower().replace(" ", "-")],
                })

    doc.close()
    return products


def extract_megatop(filepath):
    """Extract Megatop/Hikvision camera products — alternating model/price lines."""
    doc = fitz.open(filepath)
    products = []

    for page_num in range(doc.page_count):
        page = doc[page_num]
        text = page.get_text("text")
        lines = [l.strip() for l in text.split('\n') if l.strip()]

        j = 0
        while j < len(lines) - 1:
            line = lines[j]
            next_line = lines[j + 1] if j + 1 < len(lines) else ''

            # Check if current line is a model (DS- or iDS-) and next line is EGP price
            if re.match(r'^(DS-|iDS-)', line) and next_line.startswith('EGP'):
                model = line
                price = clean_price(next_line)
                if price and price > 0:
                    # Determine subcategory from model prefix
                    subcat = "Security Camera"
                    if "DS-2CE" in model:
                        subcat = "Turbo HD Camera"
                    elif "DS-2CD" in model:
                        subcat = "Network Camera"
                    elif "DS-7" in model or "iDS-7" in model:
                        subcat = "DVR/NVR"

                    # Determine resolution from model naming
                    desc_parts = [subcat]
                    if "K0T" in model:
                        desc_parts.append("3K Resolution")
                    elif "D0T" in model:
                        desc_parts.append("2MP Resolution")
                    elif "1043" in model or "1143" in model or "1343" in model:
                        desc_parts.append("4MP Resolution")
                    elif "1083" in model or "1183" in model:
                        desc_parts.append("4K Resolution")

                    if "ColorVu" in model or "DF0T" in model or "KF0T" in model:
                        desc_parts.append("ColorVu")
                    if "LPFS" in model or "LPTS" in model:
                        desc_parts.append("With Mic/Audio")

                    products.append({
                        "name": f"Hikvision {model}",
                        "model": model,
                        "description": " - ".join(desc_parts),
                        "price": price,
                        "brand": "Hikvision",
                        "category": subcat,
                        "parentCategory": "Security & Surveillance",
                        "features": [],
                        "stock": 30,
                        "tags": ["hikvision", "security", "camera", subcat.lower().replace(" ", "-")],
                    })
                j += 2
            else:
                j += 1

    doc.close()
    return products


def extract_hikvision_intercom(filepath):
    """Extract Hikvision Video Intercom products — structured table with Sr.No, Model, Price."""
    doc = fitz.open(filepath)
    products = []

    for page_num in range(doc.page_count):
        page = doc[page_num]
        tables = page.find_tables()
        if not tables or not tables.tables:
            continue

        for table in tables.tables:
            rows = table.extract()
            for row in rows:
                if not row or len(row) < 4:
                    continue

                sr_no = str(row[0]).strip() if row[0] else ""
                model = str(row[1]).strip() if row[1] else ""
                price_str = str(row[3]).strip() if row[3] else ""

                # Skip headers
                if sr_no.lower() in ("sr.no", "sr.no.", "") or "Price List" in model:
                    continue

                price = clean_price(price_str)
                if not price or not model:
                    continue

                products.append({
                    "name": f"Hikvision {model}",
                    "model": model,
                    "description": "Video Intercom System",
                    "price": price,
                    "brand": "Hikvision",
                    "category": "Video Intercom",
                    "parentCategory": "Security & Surveillance",
                    "features": [],
                    "stock": 20,
                    "tags": ["hikvision", "intercom", "video-intercom", "security"],
                })

    doc.close()
    return products


def extract_racks(filepath):
    """Extract Rack products — table with Type, Size, Description, Price."""
    doc = fitz.open(filepath)
    products = []

    for page_num in range(doc.page_count):
        page = doc[page_num]
        tables = page.find_tables()
        if not tables or not tables.tables:
            continue

        for table in tables.tables:
            rows = table.extract()
            for row in rows:
                if not row or len(row) < 4:
                    continue

                rack_type = str(row[0]).strip() if row[0] else ""
                size = str(row[1]).strip() if row[1] else ""
                description = str(row[2]).strip() if row[2] else ""
                price_str = str(row[3]).strip() if row[3] else ""

                # Skip headers and category rows
                if not description or rack_type.lower() in ("type", ""):
                    continue

                price = clean_price(price_str)
                if not price:
                    continue

                # Extract model from description
                model_match = re.search(r'(OM-[\w\-]+)', description)
                model = model_match.group(1) if model_match else rack_type

                # Build a unique name. Rack model codes can repeat for the
                # same (type, size) — e.g. OM-RK12U-MT (wall, 4730) and
                # OM-RK12U-OUT (outdoor cooling, 10450) both render as
                # "Rack 12U / 60x45". Always include the OM- code so the
                # name uniquely identifies the SKU.
                clean_size = re.sub(r"\s+", " ", size).strip() if size else ""
                name = rack_type
                if clean_size:
                    name += f" ({clean_size})"
                name += f" [{model}]"

                products.append({
                    "name": name,
                    "model": model,
                    "description": description,
                    "price": price,
                    "brand": "Hikvision",
                    "category": "Server Racks",
                    "parentCategory": "Networking",
                    "features": [f"Size: {size}"] if size else [],
                    "stock": 15,
                    "tags": ["hikvision", "rack", "server", "networking"],
                })

    doc.close()
    return products


def main():
    pdf_dir = os.path.dirname(os.path.abspath(__file__))
    all_products = []

    # 1. TP-Link (largest catalog)
    tp_path = os.path.join(pdf_dir, "TP-Link Price List 1-4-2026 EGP UPDATED.pdf")
    if os.path.exists(tp_path):
        tplink = extract_tplink(tp_path)
        print(f"✅ TP-Link: {len(tplink)} products extracted")
        all_products.extend(tplink)

    # 2. Megatop / Hikvision Cameras
    mega_path = os.path.join(pdf_dir, "2026Q2 New MSRP_Megatop.pdf")
    if os.path.exists(mega_path):
        megatop = extract_megatop(mega_path)
        print(f"✅ Megatop (Cameras): {len(megatop)} products extracted")
        all_products.extend(megatop)

    # 3. Hikvision Intercom
    hik_path = os.path.join(pdf_dir, "HIKVISION Video Intercom Price List-End User MSRP-2026Q1 megatop.pdf")
    if os.path.exists(hik_path):
        intercom = extract_hikvision_intercom(hik_path)
        print(f"✅ Hikvision Intercom: {len(intercom)} products extracted")
        all_products.extend(intercom)

    # 4. Racks
    rack_path = os.path.join(pdf_dir, "Rack Price Megatop.pdf")
    if os.path.exists(rack_path):
        racks = extract_racks(rack_path)
        print(f"✅ Racks: {len(racks)} products extracted")
        all_products.extend(racks)

    # 5. Sound System — image-based PDF, no extractable tables
    print(f"⚠️  Sound System: Image-based PDF, manual entry needed")

    # Summary
    print(f"\n{'='*50}")
    print(f"📦 Total products extracted: {len(all_products)}")

    # Category breakdown
    categories = {}
    for p in all_products:
        cat = p.get("category", "Unknown")
        categories[cat] = categories.get(cat, 0) + 1
    print(f"\nCategory breakdown:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")

    # Brand breakdown
    brands = {}
    for p in all_products:
        b = p.get("brand", "Unknown")
        brands[b] = brands.get(b, 0) + 1
    print(f"\nBrand breakdown:")
    for brand, count in sorted(brands.items(), key=lambda x: -x[1]):
        print(f"  {brand}: {count}")

    # Write JSON
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(all_products, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Saved to: {OUTPUT}")


if __name__ == "__main__":
    main()
