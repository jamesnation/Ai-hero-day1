import { runAgentLoop } from "./run-agent-loop";

/**
 * Test function to verify that the sources display system works correctly
 */
export const testSourcesDisplay = async () => {
  console.log("🧪 Testing Sources Display System");
  console.log("=" .repeat(50));
  
  const testQuestion = "What are the latest developments in AI technology?";
  
  try {
    console.log("📝 Testing with sources display...");
    console.log(`🔍 Question: "${testQuestion}"`);
    
    const result = await runAgentLoop(
      testQuestion,
      (annotation) => {
        if (annotation.type === "NEW_ACTION") {
          console.log(`📋 Step: ${annotation.action.title}`);
          console.log(`   Reasoning: ${annotation.action.reasoning}`);
        } else if (annotation.type === "DISPLAY_SOURCES") {
          console.log(`📋 Found ${annotation.sources.length} sources for query: "${annotation.query}"`);
          console.log("   Sources:");
          annotation.sources.forEach((source, index) => {
            console.log(`     ${index + 1}. ${source.title}`);
            console.log(`        URL: ${source.url}`);
            console.log(`        Favicon: ${source.favicon}`);
            console.log(`        Snippet: ${source.snippet.substring(0, 100)}...`);
          });
        }
      },
      undefined, // No telemetry for this test
      [], // No conversation history for tests
      undefined // No onFinish for tests
    );
    
    console.log("\n✅ Sources display test completed successfully");
    console.log(`📝 Final answer length: ${(await result.text).length} characters`);
    console.log("🔍 Check the frontend to see the beautiful sources display!");
    
  } catch (error) {
    console.error("❌ Sources display test failed:", error);
  }
};

// Uncomment the line below to run the test
// testSourcesDisplay();
