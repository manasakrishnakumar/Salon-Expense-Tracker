> **Obsolete as of Phase 4.** All 83 services in
> [`backend/src/data/servicesCatalog.js`](../backend/src/data/servicesCatalog.js)
> now have complete product-usage cost data — the 23 services listed below
> were filled in at some point without this file being updated to say so.
> Kept for history only; do not use it to judge what's still missing.

# ❌ Services WITHOUT Product Usage Details

## 23 Services Need Product Information

Please provide product usage details for these services in the following format:

**For each service, specify:**
1. Product name
2. Product MRP (total cost)
3. Total quantity in package (ml/grams/kit)
4. Quantity used per service

---

## 1. HAIR CUT
**Description:** Basic male haircut  
**Products Needed:** _Please specify what products are used (gel, spray, cape, etc.)_

Example:
```
- Hair Gel: ₹200 (500ml) → Uses 5ml per haircut
- Hair Spray: ₹300 (200ml) → Uses 3ml per haircut
```

---

## 2. BEARD
**Description:** Beard trimming/shaping  
**Products Needed:** _Please specify_

---

## 3. HAIR CUT BEARD
**Description:** Combo service (Hair Cut + Beard)  
**Products Needed:** _Please specify_

---

## 4. FEMALE H/C
**Description:** Female haircut  
**Products Needed:** _Please specify_

---

## 5. BLOWDRY
**Description:** Hair blowdry service  
**Products Needed:** _Please specify (heat protectant spray, etc.)_

---

## 6. BEARD COLOUR
**Description:** Beard coloring  
**Products Needed:** _Please specify (color cream, developer, etc.)_

---

## 7. HAIR WASH
**Description:** Basic hair wash  
**Products Needed:** _Please specify (shampoo, conditioner, etc.)_

---

## 8. CHILD H/C
**Description:** Children's haircut  
**Products Needed:** _Please specify_

---

## 9. H/MSG
**Description:** Hair massage  
**Products Needed:** _Please specify (oil, serum, etc.)_

---

## 10. EYEBROW
**Description:** Eyebrow shaping/threading  
**Products Needed:** _Please specify (thread, powder, etc.)_

---

## 11. FACIAL
**Description:** Generic facial (different from specific facials listed)  
**Products Needed:** _Please specify which products_

---

## 12. P/C
**Description:** Unknown - Please clarify what this service is  
**Products Needed:** _Please specify_

---

## 13. M/C
**Description:** Unknown - Please clarify what this service is  
**Products Needed:** _Please specify_

---

## 14. FEMALE H/SPA
**Description:** Female hair spa  
**Products Needed:** _Please specify (different from regular Hair Spa?)_

---

## 15. CLEAN UP
**Description:** Generic cleanup  
**Products Needed:** _Please specify which type of cleanup_

---

## 16. FOOT MSG
**Description:** Foot massage  
**Products Needed:** _Please specify (oil, cream, scrub, etc.)_

---

## 17. ROOT TOUCH UP
**Description:** Hair root touch up  
**Products Needed:** _Please specify (color, developer, etc.)_

---

## 18. FE COLOUR
**Description:** Female hair colour  
**Products Needed:** _Please specify (color cream, developer, etc.)_

---

## 19. IRONING
**Description:** Hair ironing/straightening  
**Products Needed:** _Please specify (heat protectant, serum, etc.)_

---

## 20. NAIL CUT
**Description:** Nail cutting service  
**Products Needed:** _Please specify (if any products are used)_

---

## 21. INSTA TREATMENT
**Description:** Instant hair treatment  
**Products Needed:** _Please specify (treatment cream, serum, etc.)_

---

## 22. SAREE DRAPING
**Description:** Saree draping service  
**Products Needed:** _Please specify (pins, clips, etc.)_

---

## 23. BOTOX
**Description:** Hair botox treatment  
**Products Needed:** _Please specify (botox serum, etc.)_

---

## 📝 How to Provide Information

### Option 1: Fill this template
```
Service: HAIR CUT
Products:
- Hair Gel: ₹200 (500ml) → Uses 5ml
- Hair Spray: ₹300 (200ml) → Uses 3ml
Total Cost Per Service: ₹___
```

### Option 2: Provide CSV
```csv
ServiceName,ProductName,MRP,TotalQuantity,Unit,QuantityUsedPerService
HAIR CUT,Hair Gel,200,500,ml,5
HAIR CUT,Hair Spray,300,200,ml,3
```

### Option 3: Share Excel/Google Sheet
Create a sheet with columns:
- Service Name
- Product Name  
- MRP
- Total Quantity
- Unit (ml/grams/kit)
- Quantity Used Per Service

---

**Important Notes:**
- Some services may not use any tracked products (e.g., Nail Cut might just be labor)
- If a service doesn't use products, just mention "No products tracked"
- Be as accurate as possible with quantities for proper cost calculation

---

**Status:** 23 services pending product details  
**Completed:** 60 services with full details  
**Total:** 83 services in system
