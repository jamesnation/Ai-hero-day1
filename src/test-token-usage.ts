import { runAgentLoop } from "./run-agent-loop";

/**
 * Test function to verify that the token usage tracking works correctly
 */
export const testTokenUsage = async () => {
  console.log("🧪 Testing Token Usage Tracking");
  console.log("=" .repeat(50));
  
  const testQuestion = "What are the latest developments in AI technology?";
  let totalTokens = 0;
  
  try {
    console.log("📝 Testing with token usage tracking...");
    console.log(`🔍 Question: "${testQuestion}"`);
    
    const result = await runAgentLoop(
      testQuestion,
      (annotation) => {
        if (annotation.type === "NEW_ACTION") {
          console.log(`📋 Step: ${annotation.action.title}`);
          console.log(`   Reasoning: ${annotation.action.reasoning}`);
        } else if (annotation.type === "DISPLAY_SOURCES") {
          console.log(`📋 Found ${annotation.sources.length} sources for query: "${annotation.query}"`);
        } else if (annotation.type === "TOKEN_USAGE") {
          totalTokens = annotation.totalTokens;
          console.log(`💰 Total tokens used: ${annotation.totalTokens.toLocaleString()}`);
        }
      },
      undefined, // No telemetry for this test
      [], // No conversation history for tests
      undefined // No onFinish for tests
    );
    
    console.log("\n✅ Token usage test completed successfully");
    console.log(`💰 Final token count: ${totalTokens.toLocaleString()}`);
    console.log(`📝 Final answer length: ${(await result.text).length} characters`);
    console.log("🔍 Check the frontend to see the token usage display!");
    
  } catch (error) {
    console.error("❌ Token usage test failed:", error);
  }
};

// Uncomment the line below to run the test
// testTokenUsage();
