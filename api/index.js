require("dotenv").config();
const express = require("express");
const twilio = require("twilio");
const serverless = require("serverless-http");
const app = express();
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/send-sms", (req, res) => {
  client.messages
    .create({
      body: 'Your Jenkins job is waiting for approval. Reply "Yes" to approve.',
      from: "+15202239555", // Your Twilio phone number
      to: "+64273814842", // Recipient's phone number
    })
    .then((message) => {
      console.log(message.sid); // Log the message SID
      res.status(200).json({ success: true, messageSid: message.sid }); // Send success response
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ success: false, error: err.message }); // Send error response
    });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports.handler = serverless(app);
