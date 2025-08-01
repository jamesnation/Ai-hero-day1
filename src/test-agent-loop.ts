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
    // Consume the stream to get the text
    await result.consumeStream();
    const finalText = await result.text;
    console.log(finalText);
    
    console.log("\n📊 Summary:");
    console.log(`- Stream type: ${typeof result}`);
    console.log(`- Text length: ${finalText.length} characters`);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Uncomment the line below to run the test
// testAgentLoop(); 