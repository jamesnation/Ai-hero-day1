import { runAgentLoop } from "./run-agent-loop";
import type { Message } from "ai";

/**
 * Test function to verify that the conversation history system works correctly
 */
export const testConversationHistory = async () => {
  console.log("🧪 Testing Conversation History System");
  console.log("=" .repeat(50));
  
  // Simulate a conversation with follow-up questions
  const conversationHistory: Message[] = [
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
  
  const followUpQuestion = "that's not working";
  
  try {
    console.log("📝 Testing with conversation history...");
    console.log(`🔍 Follow-up question: "${followUpQuestion}"`);
    console.log(`📋 Conversation history: ${conversationHistory.length} messages`);
    
    const result = await runAgentLoop(
      followUpQuestion,
      (annotation) => {
        if (annotation.type === "NEW_ACTION") {
          console.log(`📋 Step: ${annotation.action.title}`);
          console.log(`   Reasoning: ${annotation.action.reasoning}`);
        } else if (annotation.type === "DISPLAY_SOURCES") {
          console.log(`📋 Found ${annotation.sources.length} sources for query: "${annotation.query}"`);
        }
      },
      undefined, // No telemetry for this test
      conversationHistory,
      undefined // No onFinish for tests
    );
    
    console.log("\n✅ Conversation history test completed successfully");
    console.log(`📝 Final answer length: ${(await result.text).length} characters`);
    console.log("🔍 The AI should now understand the context of the follow-up question!");
    
  } catch (error) {
    console.error("❌ Conversation history test failed:", error);
  }
};

// Uncomment the line below to run the test
// testConversationHistory(); 