import { runAgentLoop } from "./run-agent-loop";
import type { OurMessageAnnotation } from "./types";

/**
 * Test function to verify that the progress indication system works
 */
export const testProgressIndication = async () => {
  console.log("🧪 Testing Progress Indication System");
  console.log("=" .repeat(50));
  
  const testQuestion = "What are the latest developments in AI technology?";
  const annotations: OurMessageAnnotation[] = [];
  
  try {
    console.log("📝 Testing with progress annotations...");
    
    const result = await runAgentLoop(testQuestion, (annotation: OurMessageAnnotation) => {
      console.log(`📋 Step ${annotations.length + 1}: ${annotation.action.title}`);
      console.log(`   Reasoning: ${annotation.action.reasoning}`);
      if (annotation.action.type === "search") {
        console.log(`   Query: ${annotation.action.query}`);
      } else if (annotation.action.type === "scrape") {
        console.log(`   URLs: ${annotation.action.urls?.join(", ")}`);
      }
      annotations.push(annotation);
    }, undefined); // No telemetry for tests
    
    console.log("\n✅ Progress indication test completed successfully");
    console.log(`📊 Total steps: ${annotations.length}`);
    console.log(`📝 Final answer length: ${(await result.text).length} characters`);
    
    // Show all steps
    console.log("\n📋 All Steps:");
    annotations.forEach((annotation, index) => {
      console.log(`   ${index + 1}. ${annotation.action.title}`);
    });
    
  } catch (error) {
    console.error("❌ Progress indication test failed:", error);
  }
};

// Uncomment the line below to run the test
// testProgressIndication(); 