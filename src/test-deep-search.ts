import { deepSearch } from "./deep-search-loop";

/**
 * Simple test function to demonstrate the deep search functionality
 * This is for testing purposes only
 */
export const testDeepSearch = async () => {
  console.log("🧪 Testing Deep Search Loop");
  console.log("=" .repeat(50));
  
  const testQuestion = "What are the latest developments in AI technology in 2024?";
  
  try {
    const result = await deepSearch(testQuestion);
    
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
// testDeepSearch(); 