import { SystemContext } from "./system-context";

/**
 * Test function to verify that the SystemContext properly stores the user question
 */
export const testContextIntegration = () => {
  console.log("🧪 Testing SystemContext Integration");
  console.log("=" .repeat(50));
  
  const testQuestion = "What are the latest developments in AI technology?";
  
  // Create a new context with the user question
  const context = new SystemContext(testQuestion);
  
  console.log("✅ Context created with user question");
  console.log(`📝 User Question: "${context.getUserQuestion()}"`);
  console.log(`📊 Current Step: ${context.getCurrentStep()}`);
  
  // Test the formatted context
  console.log("\n📋 Formatted Context:");
  console.log(context.getFormattedContext());
  
  // Test that the question is included in the formatted context
  const formattedContext = context.getFormattedContext();
  if (formattedContext.includes(testQuestion)) {
    console.log("✅ User question is properly included in formatted context");
  } else {
    console.log("❌ User question is missing from formatted context");
  }
  
  console.log("\n🎉 Context integration test completed successfully!");
};

// Uncomment the line below to run the test
// testContextIntegration(); 