import { evalite } from "evalite";
import { askDeepSearch } from "~/deep-search";
import type { Message } from "ai";
import { Factuality } from "~/factuality-scorer";
import { AnswerRelevancy } from "~/answer-relevancy-scorer";
import { devData } from "./dev";
import { ciData } from "./ci";
import { regressionData } from "./regression";
import { env } from "~/env";

let data = [...devData];

// If CI, add the CI data
if (env.EVAL_DATASET === "ci") {
  data.push(...ciData);
  // If Regression, add the regression data AND the CI data
} else if (env.EVAL_DATASET === "regression") {
  data.push(...ciData, ...regressionData);
}

evalite("Deep Search Eval", {
  data: async (): Promise<
    { input: string; expected: string }[]
  > => {
    return data;
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
    AnswerRelevancy,
  ],
}); 