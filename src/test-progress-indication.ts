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
      if (annotation.type === "NEW_ACTION") {
        console.log(`📋 Step ${annotations.length + 1}: ${annotation.action.title}`);
        console.log(`   Reasoning: ${annotation.action.reasoning}`);
        if (annotation.action.type === "answer") {
          console.log(`   Action: Ready to provide answer`);
        }
      } else if (annotation.type === "DISPLAY_SOURCES") {
        console.log(`📋 Step ${annotations.length + 1}: Found ${annotation.sources.length} sources for "${annotation.query}"`);
      }
      annotations.push(annotation);
    }, undefined, [], undefined); // No telemetry, conversation history, or onFinish for tests
    
    console.log("\n✅ Progress indication test completed successfully");
    console.log(`📊 Total steps: ${annotations.length}`);
    console.log(`📝 Final answer length: ${(await result.text).length} characters`);
    
    // Show all steps
    console.log("\n📋 All Steps:");
    annotations.forEach((annotation, index) => {
      if (annotation.type === "NEW_ACTION") {
        console.log(`   ${index + 1}. ${annotation.action.title}`);
      } else if (annotation.type === "DISPLAY_SOURCES") {
        console.log(`   ${index + 1}. Found ${annotation.sources.length} sources for "${annotation.query}"`);
      }
    });
    
  } catch (error) {
    console.error("❌ Progress indication test failed:", error);
  }
};

// Uncomment the line below to run the test
// testProgressIndication(); 