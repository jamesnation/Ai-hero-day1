import { generateChatTitle } from "./utils";
import type { Message } from "ai";

/**
 * Test function to verify that the chat title generation works correctly
 */
export const testTitleGeneration = async () => {
  console.log("🧪 Testing Chat Title Generation");
  console.log("=" .repeat(50));
  
  const testMessages: Message[] = [
    {
      id: "1",
      role: "user",
      content: "how do you install driver updates on a DaVinci Resolve speed editor"
    },
    {
      id: "2",
      role: "assistant", 
      content: "To install driver updates on a DaVinci Resolve Speed Editor, you need to download the latest drivers from Blackmagic Design's website and follow their installation instructions..."
    },
    {
      id: "3",
      role: "user",
      content: "that's not working"
    }
  ];
  
  try {
    console.log("📝 Testing title generation...");
    console.log(`📋 Messages: ${testMessages.length}`);
    
    const title = await generateChatTitle(testMessages);
    
    console.log("✅ Title generation completed successfully");
    console.log(`📝 Generated title: "${title}"`);
    console.log(`📊 Title length: ${title.length} characters`);
    
    if (title.length > 50) {
      console.log("⚠️ Warning: Title is longer than 50 characters");
    } else {
      console.log("✅ Title is within the 50 character limit");
    }
    
  } catch (error) {
    console.error("❌ Title generation test failed:", error);
  }
};

// Uncomment the line below to run the test
// testTitleGeneration(); 