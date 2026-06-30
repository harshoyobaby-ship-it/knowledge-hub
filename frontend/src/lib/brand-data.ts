export const kharesiyaParent = {
  name: "KHARESIYA BRANDS",
  tagline: "Brand Vision & Category Ownership",
  positioning: "Corporate House of Brands.",
  vision:
    "KHARESIYA will act as the parent endorsement brand across all major businesses and premium ventures of the group.",
  categoryScope: [
    "Corporate Brand",
    "Investments",
    "Technology",
    "Manufacturing",
    "Retail",
    "Education",
    "Financial Services",
    "Consumer Brands",
    "Future Ventures",
  ],
  rule: 'Any strategically important brand launched by the group may carry "A KHARESIYA BRAND" endorsement.',
};

export interface BrandProfile {
  id: string;
  name: string;
  subtitle?: string;
  positioning: string;
  vision: string;
  coreCategories: string[];
  expansionCategories: string[];
  benchmarkBrands: string[];
  strategicRule?: string;
  accent: string;
}

export const portfolioBrands: BrandProfile[] = [
  {
    id: "corvell",
    name: "CORVELL",
    positioning: "Premium Home Appliance & Consumer Electronics Brand.",
    vision:
      "To become a trusted Indian global brand in kitchen appliances, home appliances, and smart living products.",
    coreCategories: [
      "Air Fryers",
      "Induction Cooktops",
      "Electric Kettles",
      "Mixer Grinders",
      "Blenders",
      "OTG",
      "Sandwich Makers",
      "Rice Cookers",
      "Water Heaters",
      "Fans",
      "Smart Appliances",
    ],
    expansionCategories: [
      "Home Electronics",
      "Smart Home Devices",
      "Kitchen Accessories",
      "Storage Solutions",
      "Drying Racks",
      "Shelving Systems",
      "Plant Stands",
      "Home Utility Products",
    ],
    benchmarkBrands: ["Philips", "Havells", "Lifelong", "Bajaj", "Xiaomi Home"],
    accent: "from-blue-600 to-indigo-700",
  },
  {
    id: "redcop",
    name: "REDCOP",
    positioning: "Consumer Electronics & Digital Lifestyle Brand.",
    vision: "To build an affordable technology ecosystem serving everyday consumers.",
    coreCategories: [
      "Headphones",
      "Earbuds",
      "Speakers",
      "Smart Watches",
      "Chargers",
      "Power Banks",
      "Data Cables",
      "Mobile Accessories",
      "Computer Accessories",
    ],
    expansionCategories: [
      "Gaming Accessories",
      "Smart Home Accessories",
      "Personal Gadgets",
      "Lifestyle Electronics",
    ],
    benchmarkBrands: ["Boat", "Noise", "Portronics", "Ambrane"],
    accent: "from-rose-600 to-red-700",
  },
  {
    id: "newish",
    name: "NEWISH",
    positioning: "Beauty, Wellness & Personal Care Brand.",
    vision:
      "To create innovative personal care and beauty products for modern consumers.",
    coreCategories: [
      "Hair Care",
      "Skin Care",
      "Face Care",
      "Body Care",
      "Beauty Tools",
      "Grooming Products",
    ],
    expansionCategories: [
      "Cosmetics",
      "Wellness Products",
      "Supplements",
      "Beauty Devices",
      "Premium Personal Care",
    ],
    benchmarkBrands: ["Mamaearth", "Plum", "Minimalist", "WOW"],
    accent: "from-pink-500 to-rose-600",
  },
  {
    id: "oyobaby",
    name: "OYOBABY / BABY & MOM COMPANY",
    positioning: "Mother, Baby & Family Care Brand.",
    vision:
      "To become a complete ecosystem for babies, mothers, and young families.",
    coreCategories: [
      "Baby Wipes",
      "Diapers",
      "Baby Toiletries",
      "Baby Skin Care",
      "Baby Feeding Products",
      "Baby Bedding",
      "Baby Travel",
      "Baby Toys (Only Oyo baby)",
    ],
    expansionCategories: [
      "Breast Pumps",
      "Nursing Products",
      "Baby Furniture",
      "Baby Clothing",
      "Maternity Clothing",
      "Mother Care Products",
      "Baby Bedding",
      "Educational Toys",
    ],
    benchmarkBrands: ["Chicco", "Mee Mee", "Mothercare", "Philips Avent"],
    accent: "from-teal-500 to-cyan-600",
  },
  {
    id: "gadda-co",
    name: "GADDA CO",
    positioning: "Sleep & Comfort Brand.",
    vision: "To build India's most trusted sleep solutions company.",
    coreCategories: [
      "Mattresses",
      "Mattress Protectors",
      "Pillows",
      "Bedding Products",
      "Carpet",
      "Curtains",
      "Sofa Cover",
      "Sofa",
    ],
    expansionCategories: [
      "Sleep Technology",
      "Sleep Accessories",
      "Bed Frames",
      "Bedroom Furniture",
      "Sleep Wellness Products",
    ],
    benchmarkBrands: ["Wakefit", "SleepyCat", "The Sleep Company"],
    accent: "from-violet-600 to-purple-700",
  },
  {
    id: "amorite",
    name: "AMORITE",
    positioning:
      "Home Utility, Home Organization & Everyday Living Brand.",
    vision:
      "To build a mass-premium consumer brand focused on making everyday life easier through utility, organization, storage, cleaning, and household solutions. AMORITE will become a broad-based home and lifestyle brand similar to Lifelong, Amazon Basics, and Home Centre utility categories.",
    coreCategories: [
      "Storage Racks",
      "Cloth Drying Racks",
      "Shoe Racks",
      "Kitchen Shelves",
      "Kitchen Organizers",
      "Bathroom Organizers",
      "Plant Stands",
      "Utility Trolleys",
      "Foldable Furniture",
      "Laundry Baskets",
      "Storage Boxes",
      "Wardrobe Organizers",
      "Multipurpose Utility Products",
    ],
    expansionCategories: [
      "Home Improvement Products",
      "Cleaning Accessories",
      "Household Utility Products",
      "Kitchen Utility Products",
      "Home Storage Solutions",
      "Travel Utility Products",
      "Garden Utility Products",
      "Pet Utility Products",
      "Home Furnishing Accessories",
      "Small Home Appliances",
      "Smart Utility Products",
    ],
    benchmarkBrands: [
      "Lifelong",
      "Amazon Basics",
      "Home Centre",
      "Solimo",
      "IKEA",
      "Pigeon (Utility Range)",
    ],
    strategicRule:
      "Any product whose primary purpose is utility, organization, storage, convenience, or household improvement shall preferably be launched under AMORITE.",
    accent: "from-amber-500 to-orange-600",
  },
];

export const amoriteFutureCategories = [
  "Vacuum Cleaners",
  "Steam Mops",
  "Electric Cleaning Devices",
  "Garment Steamers",
  "Water Purifiers",
  "Air Purifiers",
  "Personal Utility Appliances",
  "Home Care Electronics",
];
