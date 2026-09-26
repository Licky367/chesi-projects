
/* ==========================================================
   verrah/public/css/products/category-subcategories.css

   CATEGORY SUBCATEGORIES
   BROWN THEME
   ========================================================== */


/* ==========================================================
   PAGE
   ========================================================== */

.category-subcategories-page {

    --verrah-brown: #8b4513;
    --verrah-brown-dark: #69320d;
    --verrah-brown-deep: #4b2e1f;
    --verrah-brown-light: #a86432;

    --verrah-cream: #fffaf5;
    --verrah-cream-dark: #f5eadf;

    --verrah-border: #e5d2c1;
    --verrah-text: #3f2a20;
    --verrah-muted: #806b5e;

    width: 100%;
    max-width: 1100px;

    margin: 0 auto;

    padding: 20px 16px 40px;

    box-sizing: border-box;

    color: var(--verrah-text);
}


/* ==========================================================
   HEADER
   ========================================================== */

.category-subcategories-header {

    background:
        linear-gradient(
            135deg,
            #8b4513,
            #69320d
        );

    border-radius: 16px;

    padding: 24px 22px;

    margin-bottom: 20px;

    box-shadow:
        0 6px 18px rgba(
            75,
            46,
            31,
            0.12
        );
}


.category-subcategories-header-content {

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 20px;
}


.category-subcategories-eyebrow {

    display: block;

    margin-bottom: 5px;

    font-size: 0.72rem;

    font-weight: 700;

    letter-spacing: 0.14em;

    color: #f1d8c3;
}


.category-subcategories-header h1 {

    margin: 0;

    font-size: 1.75rem;

    line-height: 1.2;

    font-weight: 700;

    color: #ffffff;

    overflow-wrap: anywhere;
}


.category-subcategories-header p {

    margin: 8px 0 0;

    color: #f4dfd0;

    font-size: 0.92rem;

    line-height: 1.5;
}


/* ==========================================================
   BACK BUTTON
   ========================================================== */

.category-subcategories-back {

    flex-shrink: 0;

    display: inline-flex;

    align-items: center;

    justify-content: center;

    min-height: 42px;

    padding: 9px 15px;

    border: 1px solid rgba(
        255,
        255,
        255,
        0.35
    );

    border-radius: 10px;

    color: #ffffff;

    background: rgba(
        255,
        255,
        255,
        0.10
    );

    text-decoration: none;

    font-size: 0.88rem;

    font-weight: 600;

    transition:
        background 0.2s ease,
        border-color 0.2s ease;
}


.category-subcategories-back:hover {

    color: #ffffff;

    background: rgba(
        255,
        255,
        255,
        0.18
    );

    border-color: rgba(
        255,
        255,
        255,
        0.55
    );
}


/* ==========================================================
   ALERT
   ========================================================== */

.category-subcategories-alert {

    margin-bottom: 18px;

    padding: 13px 15px;

    border-radius: 10px;

    font-size: 0.9rem;

    line-height: 1.45;
}


.category-subcategories-alert.error {

    color: #7a241b;

    background: #fbeceb;

    border: 1px solid #e9bbb6;

    border-left: 4px solid #9d3025;
}


/* ==========================================================
   CONTENT
   ========================================================== */

.category-subcategories-content {

    display: grid;

    grid-template-columns:
        minmax(0, 0.85fr)
        minmax(0, 1.15fr);

    gap: 18px;

    align-items: start;
}


/* ==========================================================
   CARD
   ========================================================== */

.subcategory-card {

    background: #ffffff;

    border: 1px solid var(--verrah-border);

    border-left: 5px solid var(--verrah-brown);

    border-radius: 14px;

    overflow: hidden;

    box-shadow:
        0 4px 14px rgba(
            75,
            46,
            31,
            0.07
        );
}


.subcategory-card-header {

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 15px;

    padding: 18px 18px 15px;

    border-bottom: 1px solid var(--verrah-cream-dark);

    background: var(--verrah-cream);
}


.subcategory-card-label {

    display: block;

    margin-bottom: 3px;

    color: var(--verrah-brown);

    font-size: 0.68rem;

    font-weight: 800;

    letter-spacing: 0.13em;
}


.subcategory-card-header h2 {

    margin: 0;

    color: var(--verrah-brown-deep);

    font-size: 1.2rem;

    line-height: 1.3;
}


/* ==========================================================
   COUNT
   ========================================================== */

.subcategory-count {

    display: inline-flex;

    align-items: center;

    justify-content: center;

    min-width: 34px;

    height: 34px;

    padding: 0 9px;

    box-sizing: border-box;

    border-radius: 50%;

    background: var(--verrah-brown);

    color: #ffffff;

    font-size: 0.85rem;

    font-weight: 700;
}


/* ==========================================================
   FORM
   ========================================================== */

.subcategory-form {

    padding: 20px 18px 22px;
}


.subcategory-form-group {

    margin-bottom: 16px;
}


.subcategory-form-group label {

    display: block;

    margin-bottom: 7px;

    color: var(--verrah-brown-deep);

    font-size: 0.88rem;

    font-weight: 700;
}


.subcategory-form-group input {

    width: 100%;

    min-height: 46px;

    box-sizing: border-box;

    padding: 11px 13px;

    border: 1px solid #d8c2b0;

    border-radius: 9px;

    outline: none;

    background: #ffffff;

    color: var(--verrah-text);

    font: inherit;

    font-size: 0.92rem;

    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;
}


.subcategory-form-group input::placeholder {

    color: #a18c7f;
}


.subcategory-form-group input:focus {

    border-color: var(--verrah-brown);

    box-shadow:
        0 0 0 3px rgba(
            139,
            69,
            19,
            0.10
        );
}


/* ==========================================================
   SUBMIT
   ========================================================== */

.subcategory-submit {

    width: 100%;

    min-height: 45px;

    border: none;

    border-radius: 9px;

    padding: 10px 16px;

    cursor: pointer;

    background: var(--verrah-brown);

    color: #ffffff;

    font: inherit;

    font-size: 0.9rem;

    font-weight: 700;

    transition:
        background 0.2s ease,
        transform 0.15s ease;
}


.subcategory-submit:hover {

    background: var(--verrah-brown-dark);
}


.subcategory-submit:active {

    transform: translateY(1px);
}


/* ==========================================================
   LIST
   ========================================================== */

.subcategory-list {

    padding: 8px 12px 14px;
}


.subcategory-item {

    display: flex;

    align-items: center;

    gap: 12px;

    min-height: 48px;

    padding: 8px 6px;

    border-bottom: 1px solid #eee2d8;
}


.subcategory-item:last-child {

    border-bottom: none;
}


.subcategory-number {

    flex: 0 0 30px;

    display: inline-flex;

    align-items: center;

    justify-content: center;

    width: 30px;

    height: 30px;

    border-radius: 8px;

    background: var(--verrah-cream-dark);

    color: var(--verrah-brown);

    font-size: 0.78rem;

    font-weight: 800;
}


.subcategory-name {

    min-width: 0;

    color: var(--verrah-text);

    font-size: 0.93rem;

    font-weight: 600;

    overflow-wrap: anywhere;
}


/* ==========================================================
   EMPTY STATE
   ========================================================== */

.subcategory-empty {

    padding: 35px 20px;

    text-align: center;
}


.subcategory-empty-icon {

    display: flex;

    align-items: center;

    justify-content: center;

    width: 48px;

    height: 48px;

    margin: 0 auto 13px;

    border-radius: 50%;

    background: var(--verrah-cream-dark);

    color: var(--verrah-brown);

    font-size: 1.5rem;

    font-weight: 400;
}


.subcategory-empty h3 {

    margin: 0 0 7px;

    color: var(--verrah-brown-deep);

    font-size: 1rem;
}


.subcategory-empty p {

    margin: 0;

    color: var(--verrah-muted);

    font-size: 0.86rem;

    line-height: 1.5;
}


.subcategory-empty strong {

    color: var(--verrah-brown);
}


/* ==========================================================
   MOBILE
   ========================================================== */

@media (max-width: 760px) {

    .category-subcategories-page {

        padding:
            14px
            12px
            30px;
    }


    .category-subcategories-header {

        padding: 19px 17px;

        border-radius: 13px;
    }


    .category-subcategories-header-content {

        align-items: stretch;

        flex-direction: column;

        gap: 14px;
    }


    .category-subcategories-header h1 {

        font-size: 1.5rem;
    }


    .category-subcategories-back {

        width: 100%;

        box-sizing: border-box;
    }


    .category-subcategories-content {

        grid-template-columns: 1fr;

        gap: 15px;
    }


    .subcategory-card {

        border-radius: 12px;
    }


    .subcategory-card-header {

        padding:
            16px
            15px
            14px;
    }


    .subcategory-form {

        padding:
            17px
            15px
            19px;
    }


    .subcategory-list {

        padding:
            7px
            10px
            12px;
    }

}


/* ==========================================================
   SMALL PHONES
   ========================================================== */

@media (max-width: 400px) {

    .category-subcategories-page {

        padding-left: 9px;

        padding-right: 9px;
    }


    .category-subcategories-header h1 {

        font-size: 1.4rem;
    }


    .subcategory-card-header h2 {

        font-size: 1.08rem;
    }


    .subcategory-item {

        gap: 9px;
    }

}