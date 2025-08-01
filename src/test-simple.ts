import { SystemContext } from "./system-context";

/**
 * Simple test to verify basic functionality
 */
export const testSimple = () => {
  console.log("🧪 Testing Basic Integration");
  console.log("=" .repeat(50));
  
  const testQuestion = "What is AI?";
  const context = new SystemContext(testQuestion);
  
  console.log("✅ SystemContext created successfully");
  console.log(`📝 User Question: "${context.getUserQuestion()}"`);
  console.log(`📊 Current Step: ${context.getCurrentStep()}`);
  
  // Test the formatted context
  const formattedContext = context.getFormattedContext();
  console.log("✅ Formatted context generated successfully");
  console.log(`📝 Context length: ${formattedContext.length} characters`);
  
  console.log("\n🎉 Basic integration test completed successfully!");
};

// Uncomment the line below to run the test
// testSimple(); 