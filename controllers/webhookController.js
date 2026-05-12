const axios = require('axios');

/**
 * Webhook Verification (GET)
 * Meta sends a GET request to verify the webhook endpoint
 */
exports.verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('📥 Webhook verification request received');
  console.log('Mode:', mode);
  console.log('Token:', token);

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log('✅ Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      console.log('❌ Webhook verification failed - Invalid token');
      res.sendStatus(403);
    }
  } else {
    console.log('❌ Webhook verification failed - Missing parameters');
    res.sendStatus(400);
  }
};

/**
 * Webhook Event Handler (POST)
 * Receives and processes incoming WhatsApp messages
 */
exports.handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    console.log('📨 Incoming webhook:', JSON.stringify(body, null, 2));

    // Check if this is a WhatsApp Business API event
    if (body.object === 'whatsapp_business_account') {
      // Return 200 OK immediately to acknowledge receipt
      res.sendStatus(200);

      // Process the webhook asynchronously
      await processWebhookEvent(body);
    } else {
      // Not a WhatsApp event
      console.log('⚠️ Not a WhatsApp Business event');
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    res.sendStatus(500);
  }
};

/**
 * Process WhatsApp webhook events
 */
async function processWebhookEvent(body) {
  try {
    // Extract message data from webhook payload
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      console.log('⚠️ No value in webhook payload');
      return;
    }

    // Handle different event types
    if (value.messages) {
      await handleIncomingMessage(value);
    } else if (value.statuses) {
      await handleMessageStatus(value);
    } else {
      console.log('⚠️ Unknown webhook event type');
    }
  } catch (error) {
    console.error('❌ Error processing webhook event:', error);
  }
}

/**
 * Handle incoming WhatsApp messages
 */
async function handleIncomingMessage(value) {
  try {
    const message = value.messages[0];
    const from = message.from; // Customer's phone number
    const messageId = message.id;
    const timestamp = message.timestamp;

    console.log(`📩 New message from ${from}`);

    // Extract message content based on type
    let messageData = {
      from,
      messageId,
      timestamp,
      type: message.type
    };

    switch (message.type) {
      case 'text':
        messageData.text = message.text.body;
        break;
      
      case 'audio':
        messageData.audio = {
          id: message.audio.id,
          mimeType: message.audio.mime_type
        };
        break;
      
      case 'image':
        messageData.image = {
          id: message.image.id,
          mimeType: message.image.mime_type,
          caption: message.image.caption
        };
        break;
      
      case 'document':
        messageData.document = {
          id: message.document.id,
          mimeType: message.document.mime_type,
          filename: message.document.filename
        };
        break;
      
      default:
        console.log(`⚠️ Unsupported message type: ${message.type}`);
        return;
    }

    // Forward to your backend API for processing
    await forwardToBackend(messageData);

  } catch (error) {
    console.error('❌ Error handling incoming message:', error);
  }
}

/**
 * Handle message status updates
 */
async function handleMessageStatus(value) {
  try {
    const status = value.statuses[0];
    console.log(`📊 Message status update: ${status.status} for message ${status.id}`);
    
    // You can forward status updates to your backend if needed
    // await forwardStatusToBackend(status);
  } catch (error) {
    console.error('❌ Error handling message status:', error);
  }
}

/**
 * Forward message to your backend API
 */
async function forwardToBackend(messageData) {
  try {
    const backendUrl = process.env.BACKEND_API_URL;
    const apiKey = process.env.BACKEND_API_KEY;

    if (!backendUrl) {
      console.error('❌ BACKEND_API_URL not configured');
      return;
    }

    console.log(`🔄 Forwarding message to backend: ${backendUrl}`);

    const response = await axios.post(
      `${backendUrl}/api/whatsapp/message`,
      messageData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('✅ Message forwarded successfully:', response.data);
  } catch (error) {
    console.error('❌ Error forwarding to backend:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}
