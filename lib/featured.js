// Pre-computed from the OSMI Mental Health in Tech Survey (2014), n = 1,251.
// Each chart has one clear takeaway. "highlight" marks the bar to emphasize.

export const KPIS = [
  { value: "1,251", label: "tech workers surveyed" },
  { value: "51%", label: "have sought treatment" },
  { value: "61%", label: "fear or are unsure about career impact" },
];

export const FEATURED = [
  {
    id: "age",
    title: "Seeking treatment rises with age",
    takeaway: "45+ are the most likely to get help",
    unit: "%",
    labels: ["18-24", "25-29", "30-34", "35-44", "45+"],
    values: [44.9, 47.8, 50.1, 54.7, 60.3],
    average: 50.5,
    highlight: 4,
    xTitle: "Age group",
  },
  {
    id: "family",
    title: "Family history doubles the odds",
    takeaway: "74% vs 35% sought treatment",
    unit: "%",
    labels: ["No family history", "Family history"],
    values: [35.4, 74.0],
    average: 50.5,
    highlight: 1,
    xTitle: "Family history of mental illness",
  },
  {
    id: "benefits",
    title: "Knowing your benefits matters",
    takeaway: "\"Don't know\" has the lowest rate",
    unit: "%",
    labels: ["Has benefits", "No benefits", "Don't know"],
    values: [63.8, 48.2, 37.1],
    average: 50.5,
    highlight: 0,
    xTitle: "Employer offers mental health benefits",
  },
  {
    id: "interfere",
    title: "It shows up at work",
    takeaway: "3 in 4 say it interferes sometimes or often",
    unit: "%",
    labels: ["Never", "Rarely", "Sometimes", "Often"],
    values: [4.8, 19.4, 56.8, 18.9],
    average: null,
    highlight: 2,
    xTitle: "How often it interferes with work (those treated)",
  },
];

export const SOURCE =
  "OSMI Mental Health in Tech Survey 2014 (Kaggle) · n = 1,251";
