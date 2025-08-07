import { streamFromDeepSearch } from "./deep-search";
import type { Message } from "ai";
import type { OurMessageAnnotation } from "./types";

/**
 * Test function to verify that the persistence system works correctly
 */
export const testPersistence = async () => {
  console.log("🧪 Testing Persistence System");
  console.log("=" .repeat(50));
  
  const testMessages: Message[] = [
    {
      id: "1",
      role: "user",
      content: "What are the latest developments in AI technology?"
    }
  ];
  
  try {
    console.log("📝 Testing persistence with annotations...");
    
    const result = await streamFromDeepSearch({
      messages: testMessages,
      onFinish: async ({ response }) => {
        console.log("✅ onFinish callback executed");
        console.log("📋 Response messages:", response.messages.length);
        
        // Check if the last message has annotations
        const lastMessage = response.messages[response.messages.length - 1];
        const annotations = (lastMessage as any)?.annotations as OurMessageAnnotation[] | undefined;
        if (lastMessage && annotations) {
          console.log(`✅ Annotations found: ${annotations.length} annotations`);
          annotations.forEach((annotation: OurMessageAnnotation, index: number) => {
            if (annotation.type === "NEW_ACTION") {
              console.log(`   ${index + 1}. ${annotation.action.title}`);
            } else if (annotation.type === "DISPLAY_SOURCES") {
              console.log(`   ${index + 1}. Found ${annotation.sources.length} sources for "${annotation.query}"`);
            }
          });
        } else {
          console.log("❌ No annotations found in response");
        }
      },
      telemetry: { isEnabled: false },
      writeMessageAnnotation: (annotation) => {
        if (annotation.type === "NEW_ACTION") {
          console.log(`📋 Annotation: ${annotation.action.title}`);
        } else if (annotation.type === "DISPLAY_SOURCES") {
          console.log(`📋 Found ${annotation.sources.length} sources for "${annotation.query}"`);
        }
      },
    });
    
    console.log("✅ Persistence test completed successfully");
    console.log(`📊 Result type: ${typeof result}`);
    
    // Test that we can consume the stream
    await result.consumeStream();
    console.log("✅ Stream consumed successfully");
    const finalText = await result.text;
    console.log(`📝 Final text length: ${finalText.length} characters`);
    
  } catch (error) {
    console.error("❌ Persistence test failed:", error);
  }
};

// Uncomment the line below to run the test
// testPersistence(); 