// Salon Services Data — CANONICAL COPY.
// This is now the single source of truth for the service catalog (cost,
// category, products consumed). Web and mobile no longer keep their own
// copy — they fetch it from GET /api/services. See routes/services.routes.js.
//
// 60 services WITH complete cost details
// 23 services WITHOUT details (cost is null)

export const SERVICE_CATEGORIES = {
    FACIALS: 'facials',
    CLEANUPS: 'cleanups',
    PEDICURE_MANICURE: 'pedicure_manicure',
    HAIR_SERVICES: 'hair_services',
    OTHER: 'other',
};

export const CATEGORY_LABELS = {
    [SERVICE_CATEGORIES.FACIALS]: 'Facials',
    [SERVICE_CATEGORIES.CLEANUPS]: 'Cleanups',
    [SERVICE_CATEGORIES.PEDICURE_MANICURE]: 'Pedi/Mani',
    [SERVICE_CATEGORIES.HAIR_SERVICES]: 'Hair',
    [SERVICE_CATEGORIES.OTHER]: 'Other',
};

// Services WITH complete details (60 services)
const servicesWithDetails = [
    // FACIALS
    {
        id: 'diamond_facial',
        name: 'DIAMOND FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 139.7,
        products: [
            { name: 'CLEANSER', quantity: '10g', cost: 15 },
            { name: 'SCRUB', quantity: '10g', cost: 8.5 },
            { name: 'SERUM', quantity: '5ml', cost: 17.5 },
            { name: 'TONER', quantity: '5ml', cost: 1.2 },
            { name: 'MASSAGE', quantity: '15g', cost: 45 },
            { name: 'PACK', quantity: '15g', cost: 52.5 },
        ],
    },
    {
        id: 'pearl_facial',
        name: 'PEARL FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 91.7,
        products: [
            { name: 'CLEANSER', quantity: '10g', cost: 10 },
            { name: 'SCRUB', quantity: '10g', cost: 8.5 },
            { name: 'TONER', quantity: '5ml', cost: 1.2 },
            { name: 'MASSAGE', quantity: '15g', cost: 28.5 },
            { name: 'PACK', quantity: '15g', cost: 36 },
            { name: 'POLISH', quantity: '5g', cost: 7.5 },
        ],
    },
    {
        id: 'naturs_pappaya',
        name: "NATUR'S PAPPAYA",
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 105,
        products: [
            { name: 'CLEANSER', quantity: '10g', cost: 10 },
            { name: 'SCRUB', quantity: '5g', cost: 15 },
            { name: 'SERUM', quantity: '10ml', cost: 18.5 },
            { name: 'MASSAGE', quantity: '15g', cost: 25.5 },
            { name: 'PACK', quantity: '15g', cost: 36 },
        ],
    },
    {
        id: 'whitening_cleanup',
        name: 'WHITENING CLEANUP',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 147.4,
        products: [
            { name: 'CLEANSER', quantity: '15ml', cost: 3.1 },
            { name: 'SCRUB', quantity: '10g', cost: 5.1 },
            { name: 'MASSAGE', quantity: '15g', cost: 12 },
            { name: 'TONER', quantity: '5ml', cost: 1.2 },
            { name: 'PACK', quantity: '40g', cost: 120 },
            { name: 'ROSE WATER', quantity: '120ml', cost: 6 },
        ],
    },
    {
        id: 'basic_cleanup',
        name: 'BASIC CLEANUP',
        category: SERVICE_CATEGORIES.CLEANUPS,
        cost: 17,
        products: [
            { name: 'CLEANSER', quantity: '15ml', cost: 3.1 },
            { name: 'SCRUB', quantity: '10g', cost: 5.1 },
            { name: 'TONER', quantity: '5ml', cost: 1.2 },
            { name: 'PACK', quantity: '15g', cost: 7.6 },
        ],
    },
    {
        id: 'hydravita_cleanup',
        name: 'HYDRAVITA CLEANUP',
        category: SERVICE_CATEGORIES.CLEANUPS,
        cost: 169.5,
        products: [
            { name: 'CLEANSER', quantity: '10g', cost: 20.5 },
            { name: 'SCRUB', quantity: '10g', cost: 22.5 },
            { name: 'TONER', quantity: '5ml', cost: 9.5 },
            { name: 'MASSAGE', quantity: '15g', cost: 37 },
            { name: 'PACK', quantity: '15g', cost: 80 },
        ],
    },
    {
        id: 'puravita_cleanup',
        name: 'PURAVITA CLEANUP',
        category: SERVICE_CATEGORIES.CLEANUPS,
        cost: 158,
        products: [
            { name: 'CLEANSER', quantity: '10g', cost: 19.5 },
            { name: 'SCRUB', quantity: '10g', cost: 18 },
            { name: 'TONER', quantity: '5ml', cost: 9.5 },
            { name: 'MASSAGE', quantity: '15g', cost: 31 },
            { name: 'PACK', quantity: '15g', cost: 80 },
        ],
    },
    {
        id: 'goldsheen_facial',
        name: 'GOLDSHEEN FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 434,
        products: [
            { name: 'FACIAL KIT', quantity: '1 kit', cost: 356 },
            { name: 'CLEANSER', quantity: '10g', cost: 19.5 },
            { name: 'SCRUB', quantity: '10g', cost: 18 },
            { name: 'TONER', quantity: '5ml', cost: 9.5 },
            { name: 'MASSAGE', quantity: '15g', cost: 31 },
        ],
    },
    {
        id: 'instafair_facial',
        name: 'INSTAFAIR FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 380,
        products: [
            { name: 'FACIAL KIT', quantity: '1 kit', cost: 302 },
            { name: 'CLEANSER', quantity: '10g', cost: 19.5 },
            { name: 'SCRUB', quantity: '10g', cost: 18 },
            { name: 'TONER', quantity: '5ml', cost: 9.5 },
            { name: 'MASSAGE', quantity: '15g', cost: 31 },
        ],
    },
    {
        id: 'dipigmentone',
        name: 'DIPIGMENTONE',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 285.5,
        products: [
            { name: 'FACIAL KIT', quantity: '1 kit', cost: 248 },
            { name: 'CLEANSER', quantity: '10g', cost: 19.5 },
            { name: 'SCRUB', quantity: '10g', cost: 18 },
        ],
    },
    {
        id: 'glowdermi',
        name: 'GLOWDERMI',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 284.5,
        products: [
            { name: 'FACIAL KIT', quantity: '1 kit', cost: 216 },
            { name: 'CLEANSER', quantity: '10g', cost: 19.5 },
            { name: 'SCRUB', quantity: '10g', cost: 18 },
            { name: 'MASSAGE', quantity: '15g', cost: 31 },
        ],
    },
    {
        id: 'acnex',
        name: 'ACNEX',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 295,
        products: [
            { name: 'FACIAL KIT', quantity: '1 kit', cost: 248 },
            { name: 'CLEANSER', quantity: '10g', cost: 19.5 },
            { name: 'SCRUB', quantity: '10g', cost: 18 },
            { name: 'TONER', quantity: '5ml', cost: 9.5 },
        ],
    },
    {
        id: 'pappaya_facial',
        name: 'PAPPAYA FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 480,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 480 }],
    },
    {
        id: 'bear_berry_facial',
        name: 'BEAR BERRY FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 493,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 493 }],
    },
    {
        id: 'vino_grapes_facial',
        name: 'VINO GRAPES FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 480,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 480 }],
    },
    {
        id: 'pine_apple_facial',
        name: 'PINE APPLE FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 480,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 480 }],
    },
    {
        id: 'kiwi_facial',
        name: 'KIWI FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 493,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 493 }],
    },
    {
        id: 'ultima_pearl_facial',
        name: 'ULTIMA PEARL FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 753,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 753 }],
    },
    {
        id: 'retamin_youth_brightening',
        name: 'RETAMIN YOUTH BRIGHTENING FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 451,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 451 }],
    },
    {
        id: 'retamin_skin_brightening',
        name: 'RETAMIN SKIN BRIGHTENING FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 406,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 406 }],
    },
    {
        id: 'bridelglow_whitening',
        name: 'BRIDELGLOW SKIN WHITENING FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 243,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 243 }],
    },
    {
        id: 'bridelglow_brightening',
        name: 'BRIDELGLOW SKIN BRIGHTENING FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 256,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 256 }],
    },
    {
        id: 'promen_facial',
        name: 'PROMEN FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 276,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 276 }],
    },
    {
        id: 'raaga_gold_facial',
        name: 'RAAGA GOLD FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 356,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 356 }],
    },
    {
        id: 'raaga_platinum_facial',
        name: 'RAAGA PLATINUM FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 408,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 408 }],
    },
    {
        id: 'raaga_bridel_facial',
        name: 'RAAGA BRIDEL FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 562,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 562 }],
    },
    {
        id: 'seasoul_hydra_facial',
        name: 'SEASOUL HYDRA FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 147,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 147 }],
    },
    {
        id: 'korean_glass_facial',
        name: 'KOREAN GLASS FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 254,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 254 }],
    },
    {
        id: 'dead_sea_deep_hydrate',
        name: 'DEAD SEA DEEP HYDRATE FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 228,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 228 }],
    },
    {
        id: 'dead_sea_argan_oily',
        name: 'DEAD SEA ARGAN CLARIFYING OILY FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 228,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 228 }],
    },
    {
        id: 'dead_sea_argan_acne',
        name: 'DEAD SEA ARG CLARIFYING ACNE FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 228,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 228 }],
    },
    {
        id: 'dead_sea_anti_aging',
        name: 'DEAD SEA ANTI AGING FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 228,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 228 }],
    },
    {
        id: 'gold_moroccan_anti_aging',
        name: 'GOLD MOROCCAN ANTI AGING FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 233,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 233 }],
    },
    {
        id: 'gold_moroccan_dry_skin',
        name: 'GOLD MOROCCAN ARGAN DRY SKIN FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 233,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 233 }],
    },
    {
        id: 'gold_moroccan_oily_skin',
        name: 'GOLD MOROCCAN ARGAN OILY SKIN FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 233,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 233 }],
    },
    {
        id: 'cryo_depigmentation',
        name: 'CRYO-RED CARPET DEPIGMENTATION FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 382,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 382 }],
    },
    {
        id: 'cryo_anti_aging',
        name: 'CRYO-RED CARPET DNA ANTI AGING FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 382,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 382 }],
    },
    {
        id: 'cryo_pore_minimising',
        name: 'CRYO-RED CARPET DNA PORE MINIMISING FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 382,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 382 }],
    },
    {
        id: 'derma_ice_anti_acne',
        name: 'DERMA ICE-BRIGHTENING ANTI ACNE FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 295,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 295 }],
    },
    {
        id: 'derma_ice_instantglow',
        name: 'DERMA ICE-FACIAL INSTANTGLOW FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 295,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 295 }],
    },
    {
        id: 'derma_ice_tightening',
        name: 'DERMA ICE-FACIAL TIGHTENING FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 295,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 295 }],
    },
    {
        id: 'seasoul_pure_moist',
        name: 'SEASOUL PURE MOIST FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 122,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 122 }],
    },
    {
        id: 'seasoul_pure_pore',
        name: 'SEASOUL PURE PORE FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 122,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 122 }],
    },
    {
        id: 'dead_sea_chocomint',
        name: 'DEAD SEA CHOCOMINT FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 167,
        products: [{ name: 'FACIAL KIT', quantity: '1 kit', cost: 167 }],
    },
    // CLEANUPS
    {
        id: 'seasoul_organic_dry',
        name: 'SEASOUL BASIC ORGANIC CLEANUP DRY SKIN',
        category: SERVICE_CATEGORIES.CLEANUPS,
        cost: 92,
        products: [{ name: 'CLEANUP KIT', quantity: '1 kit', cost: 92 }],
    },
    {
        id: 'seasoul_organic_oily',
        name: 'SEASOUL BASIC ORGANIC CLEANUP OILY SKIN',
        category: SERVICE_CATEGORIES.CLEANUPS,
        cost: 92,
        products: [{ name: 'CLEANUP KIT', quantity: '1 kit', cost: 92 }],
    },
    {
        id: 'seasoul_organic_acne',
        name: 'SEASOUL BASIC ORGANIC ACNE CLEANUP',
        category: SERVICE_CATEGORIES.CLEANUPS,
        cost: 92,
        products: [{ name: 'CLEANUP KIT', quantity: '1 kit', cost: 92 }],
    },
    {
        id: 'seasoul_organic_brazilian',
        name: 'SEASOUL BASIC ORGANIC BRAZILIAN',
        category: SERVICE_CATEGORIES.CLEANUPS,
        cost: 92,
        products: [{ name: 'CLEANUP KIT', quantity: '1 kit', cost: 92 }],
    },
    // PEDICURE/MANICURE
    {
        id: 'lotus_pedicure',
        name: 'LOTUS PEDICURE',
        category: SERVICE_CATEGORIES.PEDICURE_MANICURE,
        cost: 246,
        products: [{ name: 'PEDICURE KIT', quantity: '1 kit', cost: 246 }],
    },
    {
        id: 'raaga_pedicure',
        name: 'RAAGA PEDICURE',
        category: SERVICE_CATEGORIES.PEDICURE_MANICURE,
        cost: 165,
        products: [{ name: 'PEDICURE KIT', quantity: '1 kit', cost: 165 }],
    },
    {
        id: 'dead_sea_anti_tan_pedicure',
        name: 'DEAD SEA ANTI TAN PEDICURE',
        category: SERVICE_CATEGORIES.PEDICURE_MANICURE,
        cost: 133,
        products: [{ name: 'PEDICURE KIT', quantity: '1 kit', cost: 133 }],
    },
    {
        id: 'candelspa_pedi_mani',
        name: 'CANDELSPA PEDI MANI',
        category: SERVICE_CATEGORIES.PEDICURE_MANICURE,
        cost: 203,
        products: [{ name: 'PEDICURE KIT', quantity: '1 kit', cost: 203 }],
    },
    {
        id: 'bombshell_pedi_mani',
        name: 'BOMBSHELL PEDI MANI',
        category: SERVICE_CATEGORIES.PEDICURE_MANICURE,
        cost: 203,
        products: [{ name: 'PEDICURE KIT', quantity: '1 kit', cost: 203 }],
    },
    {
        id: 'basic_mani_pedi',
        name: 'BASIC MANI PEDI',
        category: SERVICE_CATEGORIES.PEDICURE_MANICURE,
        cost: 38,
        products: [{ name: 'PEDICURE KIT', quantity: '1 kit', cost: 38 }],
    },
    {
        id: 'chocolate_mint_pedicure',
        name: 'CHOCOLATE MINT PEDICURE',
        category: SERVICE_CATEGORIES.PEDICURE_MANICURE,
        cost: 102,
        products: [{ name: 'PEDICURE KIT', quantity: '1 kit', cost: 102 }],
    },
    // OTHER SERVICES with details
    {
        id: 'raaga_d_tan',
        name: 'RAAGA D TAN',
        category: SERVICE_CATEGORIES.OTHER,
        cost: 38,
        products: [{ name: 'D TAN', quantity: '20g', cost: 38 }],
    },
    {
        id: 'raaga_wax',
        name: 'RAAGA WAX',
        category: SERVICE_CATEGORIES.OTHER,
        cost: 181,
        products: [{ name: 'WAX TIN', quantity: '150g', cost: 181 }],
        note: 'Full leg, full arms, under arms',
    },
    {
        id: 'hair_spa',
        name: 'HAIR SPA',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 265,
        products: [{ name: 'HAIR SPA BOX', quantity: '166g', cost: 265 }],
        note: 'For shoulder level',
    },
    {
        id: 'majirel_men_colour',
        name: 'MAJIREL MEN COLOUR',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 270,
        products: [{ name: 'COLOUR', quantity: '90g', cost: 270 }],
    },
    {
        id: 'inova_men_colour',
        name: 'INOVA MEN COLOUR',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 340,
        products: [{ name: 'COLOUR', quantity: '70g', cost: 340 }],
    },
];

// Services previously without details — now fully costed
const servicesWithoutDetails = [
    {
        id: 'hair_cut',
        name: 'HAIR CUT',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 6.5,
        products: [
            { name: 'HAIR GEL', quantity: '5g', cost: 4.5 },
            { name: 'TALCUM POWDER', quantity: '5g', cost: 2 },
        ],
    },
    {
        id: 'beard',
        name: 'BEARD',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 13,
        products: [
            { name: 'SHAVING FOAM', quantity: '8g', cost: 6 },
            { name: 'AFTER SHAVE LOTION', quantity: '5ml', cost: 5 },
            { name: 'ALUM BLOCK', quantity: '1 use', cost: 2 },
        ],
    },
    {
        id: 'hair_cut_beard',
        name: 'HAIR CUT BEARD',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 19.5,
        products: [
            { name: 'HAIR GEL', quantity: '5g', cost: 4.5 },
            { name: 'TALCUM POWDER', quantity: '5g', cost: 2 },
            { name: 'SHAVING FOAM', quantity: '8g', cost: 6 },
            { name: 'AFTER SHAVE LOTION', quantity: '5ml', cost: 5 },
            { name: 'ALUM BLOCK', quantity: '1 use', cost: 2 },
        ],
    },
    {
        id: 'female_hc',
        name: 'FEMALE H/C',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 20,
        products: [
            { name: 'SHAMPOO', quantity: '10ml', cost: 12 },
            { name: 'CONDITIONER', quantity: '5ml', cost: 8 },
        ],
    },
    {
        id: 'blowdry',
        name: 'BLOWDRY',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 9,
        products: [
            { name: 'HEAT PROTECTOR SPRAY', quantity: '5ml', cost: 9 },
        ],
    },
    {
        id: 'beard_colour',
        name: 'BEARD COLOUR',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 38,
        products: [
            { name: 'BEARD DYE', quantity: '10g', cost: 22 },
            { name: 'DEVELOPER', quantity: '10ml', cost: 10 },
            { name: 'SHAVING FOAM', quantity: '5g', cost: 4 },
            { name: 'AFTER SHAVE LOTION', quantity: '3ml', cost: 2 },
        ],
    },
    {
        id: 'hair_wash',
        name: 'HAIR WASH',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 24,
        products: [
            { name: 'SHAMPOO', quantity: '15ml', cost: 18 },
            { name: 'CONDITIONER', quantity: '8ml', cost: 6 },
        ],
    },
    {
        id: 'child_hc',
        name: 'CHILD H/C',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 4,
        products: [
            { name: 'HAIR GEL', quantity: '3g', cost: 2.5 },
            { name: 'TALCUM POWDER', quantity: '3g', cost: 1.5 },
        ],
    },
    {
        id: 'h_msg',
        name: 'H/MSG',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 18,
        products: [
            { name: 'HAIR OIL', quantity: '10ml', cost: 12 },
            { name: 'SHAMPOO', quantity: '8ml', cost: 6 },
        ],
    },
    {
        id: 'eyebrow',
        name: 'EYEBROW',
        category: SERVICE_CATEGORIES.OTHER,
        cost: 3,
        products: [
            { name: 'THREADING THREAD', quantity: '1 use', cost: 1.5 },
            { name: 'ALUM BLOCK', quantity: '1 use', cost: 1.5 },
        ],
    },
    {
        id: 'facial_generic',
        name: 'FACIAL',
        category: SERVICE_CATEGORIES.FACIALS,
        cost: 27,
        products: [
            { name: 'CLEANSER', quantity: '10g', cost: 10 },
            { name: 'SCRUB', quantity: '5g', cost: 4.5 },
            { name: 'PACK', quantity: '15g', cost: 7.6 },
            { name: 'TONER', quantity: '5ml', cost: 1.2 },
            { name: 'ROSE WATER', quantity: '30ml', cost: 1.5 },
            { name: 'COTTON', quantity: '5g', cost: 2.2 },
        ],
    },
    {
        id: 'pc',
        name: 'P/C',
        category: SERVICE_CATEGORIES.PEDICURE_MANICURE,
        cost: 42,
        products: [
            { name: 'FOOT SCRUB', quantity: '15g', cost: 18 },
            { name: 'FOOT CREAM', quantity: '10g', cost: 14 },
            { name: 'CUTICLE OIL', quantity: '3ml', cost: 6 },
            { name: 'COTTON', quantity: '5g', cost: 4 },
        ],
    },
    {
        id: 'mc',
        name: 'M/C',
        category: SERVICE_CATEGORIES.PEDICURE_MANICURE,
        cost: 24,
        products: [
            { name: 'NAIL POLISH REMOVER', quantity: '5ml', cost: 4 },
            { name: 'CUTICLE OIL', quantity: '3ml', cost: 6 },
            { name: 'HAND CREAM', quantity: '5g', cost: 8 },
            { name: 'COTTON', quantity: '5g', cost: 4 },
            { name: 'NAIL BUFFER', quantity: '1 use', cost: 2 },
        ],
    },
    {
        id: 'female_hspa',
        name: 'FEMALE H/SPA',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 92,
        products: [
            { name: 'SHAMPOO', quantity: '15ml', cost: 18 },
            { name: 'SPA HAIR MASK', quantity: '20g', cost: 52 },
            { name: 'CONDITIONER', quantity: '10ml', cost: 12 },
            { name: 'HAIR OIL', quantity: '5ml', cost: 6 },
            { name: 'HEAT PROTECTOR SPRAY', quantity: '3ml', cost: 4 },
        ],
    },
    {
        id: 'clean_up_generic',
        name: 'CLEAN UP',
        category: SERVICE_CATEGORIES.CLEANUPS,
        cost: 28,
        products: [
            { name: 'CLEANSER', quantity: '15g', cost: 10 },
            { name: 'SCRUB', quantity: '10g', cost: 8.5 },
            { name: 'PACK', quantity: '15g', cost: 7.6 },
            { name: 'TONER', quantity: '5ml', cost: 1.2 },
            { name: 'COTTON', quantity: '5g', cost: 0.7 },
        ],
    },
    {
        id: 'foot_msg',
        name: 'FOOT MSG',
        category: SERVICE_CATEGORIES.PEDICURE_MANICURE,
        cost: 20,
        products: [
            { name: 'FOOT CREAM', quantity: '15g', cost: 14 },
            { name: 'FOOT SCRUB', quantity: '8g', cost: 6 },
        ],
    },
    {
        id: 'root_touch_up',
        name: 'ROOT TOUCH UP',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 98,
        products: [
            { name: 'ROOT COLOUR', quantity: '30g', cost: 60 },
            { name: 'DEVELOPER', quantity: '30ml', cost: 24 },
            { name: 'SHAMPOO', quantity: '10ml', cost: 12 },
            { name: 'CONDITIONER', quantity: '5ml', cost: 2 },
        ],
    },
    {
        id: 'fe_colour',
        name: 'FE COLOUR',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 185,
        products: [
            { name: 'HAIR COLOUR', quantity: '90g', cost: 135 },
            { name: 'DEVELOPER', quantity: '90ml', cost: 36 },
            { name: 'SHAMPOO', quantity: '10ml', cost: 12 },
            { name: 'CONDITIONER', quantity: '5ml', cost: 2 },
        ],
    },
    {
        id: 'ironing',
        name: 'IRONING',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 14,
        products: [
            { name: 'HEAT PROTECTOR SPRAY', quantity: '10ml', cost: 14 },
        ],
    },
    {
        id: 'nail_cut',
        name: 'NAIL CUT',
        category: SERVICE_CATEGORIES.PEDICURE_MANICURE,
        cost: 3,
        products: [
            { name: 'NAIL POLISH REMOVER', quantity: '2ml', cost: 1.5 },
            { name: 'COTTON', quantity: '2g', cost: 0.5 },
            { name: 'ALUM BLOCK', quantity: '1 use', cost: 1 },
        ],
    },
    {
        id: 'insta_treatment',
        name: 'INSTA TREATMENT',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 48,
        products: [
            { name: 'INSTANT HAIR MASK', quantity: '20g', cost: 32 },
            { name: 'SHAMPOO', quantity: '10ml', cost: 12 },
            { name: 'CONDITIONER', quantity: '5ml', cost: 4 },
        ],
    },
    {
        id: 'saree_draping',
        name: 'SAREE DRAPING',
        category: SERVICE_CATEGORIES.OTHER,
        cost: 5,
        products: [
            { name: 'SAFETY PINS', quantity: '5 pcs', cost: 3 },
            { name: 'BLOUSE PINS', quantity: '3 pcs', cost: 2 },
        ],
    },
    {
        id: 'botox',
        name: 'BOTOX',
        category: SERVICE_CATEGORIES.HAIR_SERVICES,
        cost: 125,
        products: [
            { name: 'BOTOX SOLUTION', quantity: '5ml', cost: 82 },
            { name: 'DEVELOPER', quantity: '5ml', cost: 4 },
            { name: 'SHAMPOO', quantity: '15ml', cost: 18 },
            { name: 'CONDITIONER', quantity: '10ml', cost: 8 },
            { name: 'HEAT PROTECTOR SPRAY', quantity: '8ml', cost: 11 },
            { name: 'KERATIN SEALER', quantity: '3ml', cost: 2 },
        ],
    },
];

// Combined all services
export const ALL_SERVICES = [...servicesWithDetails, ...servicesWithoutDetails];

// Helper functions
export const getServicesByCategory = (category) => {
    return ALL_SERVICES.filter((service) => service.category === category);
};

export const getServiceById = (id) => {
    return ALL_SERVICES.find((service) => service.id === id);
};

export const getServicesWithCost = () => {
    return ALL_SERVICES.filter((service) => service.cost !== null);
};

export const getServicesWithoutCost = () => {
    return ALL_SERVICES.filter((service) => service.cost === null);
};

export const getCategoryCount = () => {
    return {
        [SERVICE_CATEGORIES.FACIALS]: getServicesByCategory(SERVICE_CATEGORIES.FACIALS).length,
        [SERVICE_CATEGORIES.CLEANUPS]: getServicesByCategory(SERVICE_CATEGORIES.CLEANUPS).length,
        [SERVICE_CATEGORIES.PEDICURE_MANICURE]: getServicesByCategory(SERVICE_CATEGORIES.PEDICURE_MANICURE).length,
        [SERVICE_CATEGORIES.HAIR_SERVICES]: getServicesByCategory(SERVICE_CATEGORIES.HAIR_SERVICES).length,
        [SERVICE_CATEGORIES.OTHER]: getServicesByCategory(SERVICE_CATEGORIES.OTHER).length,
    };
};
