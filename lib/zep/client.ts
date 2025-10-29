import { ZepClient } from "@getzep/zep-cloud";

let zepClient: ZepClient | null = null;

// Define Message type inline since it's not exported
interface Message {
  role: "user" | "assistant" | "system" | "function" | "tool";
  content: string;
  name?: string;
  roleType?: string;
  metadata?: Record<string, any>;
}

export function getZepClient(): ZepClient {
  if (!zepClient) {
    const apiKey = process.env.ZEP_API_KEY;

    if (!apiKey) {
      throw new Error('ZEP_API_KEY is not configured');
    }

    zepClient = new ZepClient({
      apiKey: apiKey,
    });
  }

  return zepClient;
}

export async function ensureZepUser(
  userId: string,
  email?: string,
  firstName?: string,
  lastName?: string
) {
  try {
    const client = getZepClient();

    try {
      // Fix: user.get() takes userId as string and optional requestOptions
      await client.user.get(userId);
      return true;
    } catch (error: any) {
      if (error.statusCode === 404 || error.status === 404) {
        await client.user.add({
          userId: userId,
          email: email,
          firstName: firstName,
          lastName: lastName,
        });
        console.log('✅ Created Zep user:', userId);
        return true;
      }
      // User already exists - that's fine
      if (error.statusCode === 400 && error.body?.message?.includes('already exists')) {
        console.log('User already exists in Zep');
        return true;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error ensuring Zep user:', error);
    return false;
  }
}

export async function createZepThread(threadId: string, userId: string) {
  try {
    const client = getZepClient();

    await client.thread.create({
      userId: userId,
      threadId: threadId,
    });

    console.log('✅ Created Zep thread:', threadId);
    return true;
  } catch (error: any) {
    // Thread already exists - that's totally fine!
    if (error.statusCode === 409 || error.status === 409 ||
        error.statusCode === 400 || error.status === 400) {
      console.log('✅ Zep thread already exists:', threadId);
      return true;
    }
    console.error('❌ Error creating Zep thread:', error);
    return false;
  }
}

export async function getZepMemory(threadId: string) {
  try {
    const client = getZepClient();

    // Fix: getUserContext takes threadId as string parameter
    const context = await client.thread.getUserContext(threadId);

    return context;
  } catch (error: any) {
    if (error.statusCode === 404 || error.status === 404) {
      console.log('No Zep thread found yet (first message)');
      return null;
    }
    console.error('Error getting Zep memory:', error);
    return null;
  }
}

export async function addZepMemory(
  threadId: string,
  userMessage: string,
  assistantMessage: string,
  userName?: string
) {
  try {
    const client = getZepClient();

    const messages: Message[] = [
      {
        role: "user",
        content: userMessage,
        name: userName || "User",
      },
      {
        role: "assistant",
        content: assistantMessage,
        name: "Assistant",
      },
    ];

    // Fix: addMessages takes threadId as first param, object with messages as second
    await client.thread.addMessages(threadId, { messages });

    return true;
  } catch (error: any) {
    console.error('Error adding to Zep memory:', error);
    return false;
  }
}

export async function searchZepMemory(
  userId: string,
  query: string,
  limit: number = 10
) {
  try {
    const client = getZepClient();

    // Fix: graph.search takes an options object
    const results = await client.graph.search({
      userId: userId,
      query: query,
      scope: "edges",
    });

    return results;
  } catch (error: any) {
    console.error('Error searching Zep memory:', error);
    return null;
  }
}