import { streamFromDeepSearch } from "./deep-search";

/**
 * Test function to verify that the new agent loop system integrates properly
 */
export const testIntegration = async () => {
  console.log("🧪 Testing Agent Loop Integration");
  console.log("=" .repeat(50));
  
  const testMessages = [
    { id: '1', role: 'user' as const, content: 'What are the latest developments in AI technology?' }
  ];
  
  try {
    console.log("📝 Testing streamFromDeepSearch...");
    
    const result = await streamFromDeepSearch({
      messages: testMessages,
      onFinish: () => {
        console.log("✅ onFinish callback executed");
      },
      telemetry: { isEnabled: false },
      writeMessageAnnotation: () => {
        // No-op function for annotations - not needed in tests
      },
    });
    
    console.log("✅ streamFromDeepSearch completed successfully");
    console.log(`📊 Result type: ${typeof result}`);
    
    // Test that we can consume the stream
    await result.consumeStream();
    console.log("✅ Stream consumed successfully");
    const finalText = await result.text;
    console.log(`📝 Final text length: ${finalText.length} characters`);
    
  } catch (error) {
    console.error("❌ Integration test failed:", error);
  }
};

// Uncomment the line below to run the test
// testIntegration(); 