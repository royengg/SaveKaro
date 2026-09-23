export const guides = [
  {
    slug: "how-to-tell-if-a-discount-is-actually-good",
    title: "How to tell if a discount is actually good",
    summary:
      "A big discount badge is not enough on its own. The useful question is whether the current price is genuinely strong compared with the product’s normal selling behavior.",
    sections: [
      {
        title: "Look past the percentage first",
        body: "A 70% off label can still be weak if the reference price was inflated or if the product almost never sells at that higher number. A smaller discount can be much better when the current price is close to the best price the product usually sees.",
      },
      {
        title: "Check the actual payable price",
        body: "The only number that matters in the end is the amount you will actually pay. Bank offers, coupons, and cashback can help, but they should not distract from the real final price on the merchant page.",
      },
      {
        title: "Watch for old or misleading reference prices",
        body: "Some listings show an MRP or launch price that is not a realistic everyday selling price. A deal becomes much more convincing when the current price is low compared with the product’s usual online selling range, not just a high sticker price.",
      },
      {
        title: "Variant quality matters",
        body: "A low price is only useful if it applies to the exact size, color, storage option, or model you actually want. Some deal posts highlight the best number while the most popular variant is priced much higher.",
      },
      {
        title: "Use timing as context, not the only signal",
        body: "Festive sales, clearance windows, and flash drops can produce genuine discounts, but urgency alone does not make a deal good. Strong deals usually combine good timing with a price that still holds up after you compare it properly.",
      },
      {
        title: "Simple rule of thumb",
        body: "If the final price looks good, the variant is the right one, the store is reliable, and you would still buy it without the oversized discount badge, the deal is probably worth serious consideration.",
      },
    ],
  },
  {
    slug: "how-to-compare-coupons-bank-offers-and-cashback",
    title: "How to compare coupons, bank offers, and cashback",
    summary:
      "Most checkout savings are not equal. The useful question is not how many offer labels are shown, but what you will actually pay and what value really reaches you.",
    sections: [
      {
        title: "Start with the product price itself",
        body: "Before looking at coupons, card offers, or reward programs, check whether the listed price is already good. A weak base price does not become a strong deal just because the checkout shows several savings banners.",
      },
      {
        title: "Instant savings usually matter more",
        body: "A direct bank discount at checkout is usually easier to value than cashback, points, or future credits. Delayed rewards can still be useful, but they often come with expiry dates, redemption limits, or category restrictions.",
      },
      {
        title: "Only count offers you can actually use",
        body: "If a coupon needs a new-user account, a bank card you do not have, or a wallet you would not normally use, treat it carefully. The relevant number is not the best possible stack in theory, but the stack that fits your real checkout.",
      },
      {
        title: "Watch the conditions around cashback",
        body: "Cashback can be attractive, but it is often the easiest offer type to overvalue. Check when it arrives, where it is credited, whether there is a minimum spend requirement, and whether it is reusable like cash or trapped inside a limited reward system.",
      },
      {
        title: "Do one final payable-price check",
        body: "After all adjustments, the important number is still the real amount that leaves your account today. If the final payable price is not strong enough on its own, the deal probably does not improve just because the savings were split into three different offer labels.",
      },
    ],
  },
  {
    slug: "best-fashion-deal-stores-in-india",
    title: "Best fashion deal stores in India",
    summary:
      "The best fashion deal store depends on what you are buying. Some stores are better for mainstream brands, some for fast seasonal drops, and some for clearance-led value.",
    sections: [
      {
        title: "Ajio",
        body: "Ajio is often strong for brand-led fashion drops, end-of-season clearance, and sharp price cuts on clothing and shoes. It is worth watching when the goal is heavy markdowns rather than constant day-to-day pricing.",
      },
      {
        title: "Myntra",
        body: "Myntra is useful when you want wide brand coverage, strong filters, and frequent promotions across apparel, footwear, beauty, and accessories. It is often one of the easiest places to compare variants quickly.",
      },
      {
        title: "Tata CLiQ and similar marketplaces",
        body: "Multi-brand fashion marketplaces can be worth monitoring during sale windows, especially when brand-specific offers or bank promotions are stacked on top of listed markdowns.",
      },
      {
        title: "What makes a fashion store worth watching",
        body: "The useful signals are not just headline discounts. Good return clarity, reliable sizing information, real stock depth, and honest final pricing matter just as much as the sale percentage.",
      },
      {
        title: "Best way to use stores like these",
        body: "Treat them differently. Use one store for clearance hunting, another for broader catalog comparison, and another when you care about a specific brand or bank-offer combination. That usually produces better results than checking only one store for everything.",
      },
    ],
  },
] as const;

export type Guide = (typeof guides)[number];
