import { getChat } from "../server/db/queries";

/**
 * Test function to verify that annotations are properly loaded from the database
 */
export const testAnnotationLoading = async () => {
  console.log("🧪 Testing Annotation Loading from Database");
  console.log("=" .repeat(50));
  
  // This test would need a real chat ID from your database
  // You can run this manually with a chat ID that has annotations
  const testChatId = "your-chat-id-here"; // Replace with actual chat ID
  const testUserId = "your-user-id-here"; // Replace with actual user ID
  
  try {
    console.log("📝 Testing annotation loading...");
    console.log(`🔍 Chat ID: ${testChatId}`);
    console.log(`👤 User ID: ${testUserId}`);
    
    const dbChat = await getChat({ userId: testUserId, chatId: testChatId });
    
    if (!dbChat) {
      console.log("❌ Chat not found");
      return;
    }
    
    console.log(`✅ Chat found: "${dbChat.title}"`);
    console.log(`📋 Messages: ${dbChat.messages.length}`);
    
    // Check each message for annotations
    dbChat.messages.forEach((msg, index) => {
      console.log(`\n📝 Message ${index + 1} (${msg.role}):`);
      console.log(`   ID: ${msg.id}`);
      console.log(`   Parts: ${Array.isArray(msg.parts) ? msg.parts.length : 0} parts`);
      
      if (msg.annotations) {
        console.log(`   ✅ Annotations: ${msg.annotations.length} annotations`);
        (msg.annotations as any[]).forEach((annotation: any, annIndex: number) => {
          console.log(`      ${annIndex + 1}. ${annotation.action?.title || 'Unknown'}`);
        });
      } else {
        console.log(`   ❌ No annotations`);
      }
    });
    
    console.log("\n✅ Annotation loading test completed successfully");
    
  } catch (error) {
    console.error("❌ Annotation loading test failed:", error);
  }
};

// Uncomment the line below to run the test (after replacing with real IDs)
// testAnnotationLoading(); 