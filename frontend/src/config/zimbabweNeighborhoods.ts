export interface NeighborhoodEntry {
  city: string;
  province: string;
  neighborhoods: string[];
}

export const ZIMBABWE_NEIGHBORHOODS: NeighborhoodEntry[] = [
  {
    city: "Harare",
    province: "Harare",
    neighborhoods: [
      "Borrowdale",
      "Avondale",
      "Mount Pleasant",
      "Greendale",
      "Highlands",
      "Mabelreign",
      "Hatfield",
      "Msasa",
      "Eastlea",
      "Marlborough",
    ],
  },
  {
    city: "Bulawayo",
    province: "Bulawayo",
    neighborhoods: [
      "Suburbs",
      "Hillside",
      "Burnside",
      "Famona",
      "Matsheumhlope",
      "Northend",
      "Waterford",
    ],
  },
  {
    city: "Mutare",
    province: "Manicaland",
    neighborhoods: ["Murambi", "Dangamvura", "Chikanga", "Hobhouse"],
  },
  {
    city: "Gweru",
    province: "Midlands",
    neighborhoods: ["Mkoba", "Senga", "Ascot", "Woodlands"],
  },
];
