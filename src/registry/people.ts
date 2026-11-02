import type { Person } from "./types";

// OPEN QUESTION: confirm the named reviewer and their public profiles (E-E-A-T needs a real person).
export const people: Record<string, Person> = {
  founder: {
    id: "founder",
    name: "Shivansh Saxena",
    role: "Founder and maintainer of KlipKit",
    bio: "Builds and reviews every KlipKit tool. Software engineer focused on fast, private, browser-based utilities.",
    url: "/about#founder",
    sameAs: [],
  },
};
