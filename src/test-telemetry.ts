import { runAgentLoop } from "./run-agent-loop";

/**
 * Test function to verify that the telemetry system works correctly
 */
export const testTelemetry = async () => {
  console.log("🧪 Testing Telemetry System");
  console.log("=" .repeat(50));
  
  const testQuestion = "What are the latest developments in AI technology?";
  const testTraceId = "test-trace-123";
  
  try {
    console.log("📝 Testing with telemetry enabled...");
    console.log(`🔍 Trace ID: ${testTraceId}`);
    
    const result = await runAgentLoop(
      testQuestion, 
      (annotation) => {
        if (annotation.type === "NEW_ACTION") {
          console.log(`📋 Step: ${annotation.action.title}`);
        } else if (annotation.type === "DISPLAY_SOURCES") {
          console.log(`📋 Found ${annotation.sources.length} sources for "${annotation.query}"`);
        }
      }, 
      testTraceId,
      [], // No conversation history for tests
      undefined // No onFinish for tests
    );
    
    console.log("\n✅ Telemetry test completed successfully");
    console.log(`📝 Final answer length: ${(await result.text).length} characters`);
    console.log("🔍 Check Langfuse for traces with the following function IDs:");
    console.log("   - get-next-action");
    console.log("   - answer-question");
    console.log("   - answer-question-final");
    console.log("   - agent-loop-error-handler");
    
  } catch (error) {
    console.error("❌ Telemetry test failed:", error);
  }
};

// Uncomment the line below to run the test
// testTelemetry(); 