// Gallery entries. To use real photos: drop them in client/public/images/gallery and change the `src` values.
export const GALLERY_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "classic", label: "Classic" },
  { id: "skin-fade", label: "Skin Fade" },
  { id: "taper-fade", label: "Taper Fade" },
  { id: "beard", label: "Beard" },
  { id: "styling", label: "Hair Styling" },
];

const g = (file, category, title, tall = false) => ({
  src: `/images/gallery/${file}.jpg`,
  category,
  title,
  tall,
});
export const GALLERY = [
  g("classic-01", "classic", "Classic side parting", true),
  g("skin-fade-01", "skin-fade", "Mid skin fade"),
  g("taper-fade-01", "taper-fade", "Taper with a short beard", true),
  g("beard-01", "beard", "Full beard, shaped"),
  g("styling-01", "styling", "Long textured style", true),
  g("skin-fade-02", "skin-fade", "Skin fade with stubble", true),
  g("classic-02", "classic", "Classic cut and beard trim"),
  g("taper-fade-02", "taper-fade", "Low taper fade"),
  g("beard-02", "beard", "Buzz cut, full beard", true),
  g("styling-02", "styling", "Textured crop"),
  g("skin-fade-03", "skin-fade", "High skin fade"),
  g("beard-03", "beard", "Head shave and beard", true),
];
