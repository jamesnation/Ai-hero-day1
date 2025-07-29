import { evalite } from "evalite";
import { askDeepSearch } from "~/deep-search";
import type { Message } from "ai";
import { Factuality } from "~/factuality-scorer";

evalite("Deep Search Eval", {
  data: async (): Promise<
    { input: string; expected: string }[]
  > => {
    return [
      {
        input: "Why might vintage Masters of the Universe figures increase in value specifically post-2026?",
        expected:
          "The Masters of the Universe of the Universe Movie is debuting in 2026 and should it succeed brands will typically see an uplift in interest and value in vintage collectables.",
      },
      {
        input: "What were the toys revealed during the Masters of the Universe SDCC 2025 Panel?",
        expected:
          "- She-Ra and Swift Wind Cartoon Collection\n- MOTU Origins ThunderCats Wave 3\n- MOTU Thundercats\n- MOTU Transformers\n- Snake Lair 2.0",
      },
      {
        input: "Has there been any significant accouncements recently around Masters of the Universe 200x?",
        expected:
          "Yes, Wave 1 of the MOTU Origins 200x Cartoon Collection as announced at SDCC 2025. The 200x MOTU Origins line Wave 1 will include Stratos, Tri-Klops, He-Man, and a deluxe Beast Man, bringing updated sculpts and show-inspired designs to the Origins format.",
      },
      {
        input: "Why might WWF Hulk Hogan Hasbro vintage figures have seen a recent increase in value?",
        expected:
          "Hulk Hogan died on July 24th 2025. The deaths of individuals often leads to an increase in the value of collectables associated with them, however this can be short lived.",
      },
      {
        input: "What is the current value of a vintage WWF Hasbro Hulk Hogan Series 5 figure mint on card?",
        expected:
          "Based on marketplaces such as ebay the current value is approximately $230. This may have been impacted by recent events such as Hulk Hogans death and growing interest in vintage collectables.",
      },
      {
        input: "What is the current value of a vintage Optimus Prime G1 figure, opened, with all accessories including the box?",
        expected:
          "Based on marketplaces such as ebay the current value is approximately $310.",
      },
    ];
  },
  task: async (input: string) => {
    const messages: Message[] = [
      {
        id: "1",
        role: "user",
        content: input,
      },
    ];
    return askDeepSearch(messages);
  },
  scorers: [
    {
      name: "Contains Links",
      description: "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        // Markdown link: [text](url)
        const containsLinks = /\[[^\]]+\]\([^\)]+\)/.test(output);
        return containsLinks ? 1 : 0;
      },
    },
    Factuality,
  ],
}); 