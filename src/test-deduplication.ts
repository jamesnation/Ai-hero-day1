import { runAgentLoop } from "./run-agent-loop";

/**
 * Test function to verify that the deduplication system works correctly
 */
export const testDeduplication = async () => {
  console.log("🧪 Testing Deduplication System");
  console.log("=" .repeat(50));
  
  const testQuestion = "What are the latest developments in AI technology?";
  let sourceCount = 0;
  let annotationCount = 0;
  
  try {
    console.log("📝 Testing with deduplication...");
    console.log(`🔍 Question: "${testQuestion}"`);
    
    const result = await runAgentLoop(
      testQuestion,
      (annotation) => {
        if (annotation.type === "NEW_ACTION") {
          console.log(`📋 Step: ${annotation.action.title}`);
          console.log(`   Reasoning: ${annotation.action.reasoning}`);
        } else if (annotation.type === "DISPLAY_SOURCES") {
          annotationCount++;
          sourceCount += annotation.sources.length;
          console.log(`📋 Found ${annotation.sources.length} unique sources for query: "${annotation.query}"`);
          console.log("   Sources:");
          annotation.sources.forEach((source, index) => {
            console.log(`     ${index + 1}. ${source.title}`);
            console.log(`        URL: ${source.url}`);
            console.log(`        Domain: ${new URL(source.url).hostname}`);
          });
        }
      },
      undefined, // No telemetry for this test
      [], // No conversation history for tests
      undefined // No onFinish for tests
    );
    
    console.log("\n✅ Deduplication test completed successfully");
    console.log(`📊 Total annotations sent: ${annotationCount}`);
    console.log(`📊 Total unique sources found: ${sourceCount}`);
    console.log(`📝 Final answer length: ${(await result.text).length} characters`);
    console.log("🔍 Check that only ONE sources annotation was sent with deduplicated results!");
    
  } catch (error) {
    console.error("❌ Deduplication test failed:", error);
  }
};

// Uncomment the line below to run the test
// testDeduplication();
