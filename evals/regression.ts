export const regressionData = [
  {
    input: "What is the latest version of TypeScript?",
    expected:
      "The latest version of TypeScript is 5.8.3, released 4 months ago. TypeScript 5.8 was officially announced on March 5, 2025. Version 5.9 is currently in release candidate, and version 6.0 is planned for the future.",
  },
  {
    input: "What are the main features of Next.js 15?",
    expected: `
@next/codemod CLI: Easily upgrade to the latest Next.js and React versions.
Async Request APIs (Breaking): Incremental step towards a simplified rendering and caching model.
Caching Semantics (Breaking): fetch requests, GET Route Handlers, and client navigations are no longer cached by default.
React 19 Support: Support for React 19, React Compiler (Experimental), and hydration error improvements.
Turbopack Dev (Stable): Performance and stability improvements.
Static Indicator: New visual indicator shows static routes during development.
unstable_after API (Experimental): Execute code after a response finishes streaming.
instrumentation.js API (Stable): New API for server lifecycle observability.
Enhanced Forms (next/form): Enhance HTML forms with client-side navigation.
next.config: TypeScript support for next.config.ts.
Self-hosting Improvements: More control over Cache-Control headers.
Server Actions Security: Unguessable endpoints and removal of unused actions.
Bundling External Packages (Stable): New config options for App and Pages Router.
ESLint 9 Support: Added support for ESLint 9.
Development and Build Performance: Improved build times and Faster Fast Refresh.
`,
  },
  {
    input: "What is the capital of France?",
    expected: "Paris",
  },
  {
    input: "What is the current population of Tokyo?",
    expected: "Tokyo has a population of approximately 37.4 million people as of 2024, making it the most populous metropolitan area in the world.",
  },
  {
    input: "What are the main benefits of using TypeScript over JavaScript?",
    expected: "TypeScript provides static typing, better IDE support with autocomplete and error detection, improved code maintainability, enhanced refactoring capabilities, and helps catch errors at compile time rather than runtime.",
  },
]; 