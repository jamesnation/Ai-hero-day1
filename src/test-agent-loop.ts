import { runAgentLoop } from "./run-agent-loop";

/**
 * Simple test function to demonstrate the agent loop functionality
 * This is for testing purposes only
 */
export const testAgentLoop = async () => {
  console.log("🧪 Testing Agent Loop");
  console.log("=" .repeat(50));
  
  const testQuestion = "What are the latest developments in AI technology in 2024?";
  
  try {
    const result = await runAgentLoop(testQuestion);
    
    console.log("\n📝 Final Answer:");
    console.log(result.answer);
    
    console.log("\n📊 Summary:");
    console.log(`- Steps taken: ${result.stepCount}`);
    console.log(`- Has error: ${!!result.error}`);
    
    if (result.error) {
      console.log(`- Error: ${result.error}`);
    }
    
    console.log("\n🔍 Full Context (for debugging):");
    console.log(result.context);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Uncomment the line below to run the test
// testAgentLoop(); 