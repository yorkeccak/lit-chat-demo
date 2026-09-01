import { Valyu } from "valyu-js";

export const valyu = new Valyu(process.env.VALYU_API_KEY!);

export type Paper = {
  title: string;
  url: string;
  abstract?: string;
  content?: string;
  fullContent?: string;
  source?: string;
  doi?: string;
};
