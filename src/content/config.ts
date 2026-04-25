import { defineCollection, z } from "astro:content";

const news = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default("Redakcja klubu"),
    draft: z.boolean().default(false),
    facebookUrl: z.string().url().optional(),
    truncated: z.boolean().default(false),
  }),
});

const teams = defineCollection({
  type: "content",
  schema: z.object({
    name: z.string(),
    category: z.enum([
      "seniorzy",
      "rezerwy",
      "juniorzy",
      "trampkarze",
      "orlik",
      "zak",
      "skrzat",
      "kobiety",
      "inna",
    ]),
    league: z.string().optional(),
    coach: z.string(),
    assistantCoach: z.string().optional(),
    trainingSchedule: z.string().optional(),
    photo: z.string().optional(),
    order: z.number().default(0),
    roster: z
      .array(
        z.object({
          name: z.string(),
          number: z.number().optional(),
          position: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

export const collections = { news, teams };
