require("dotenv").config();
const express = require("express");
const twilio = require("twilio");
const app = express();
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = new twilio(accountSid, authToken);
const bodyParser = require("body-parser");

const port = process.env.PORT || 3000;
let smsApproved = false;

app.use(bodyParser.urlencoded({ extended: false }));

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

app.post("/response", (req, res) => {
  const smsResponse = req.body.Body.trim().toLowerCase();
  if (smsResponse === "yes") {
    smsApproved = true;
    console.log(json.stringify(smsResponse));
    console.log(
      `Received SMS from ${fromNumber} to ${toNumber}: ${messageBody}`
    );
    res.send("<Response><Message>Approval Received</Message></Response>");
  } else {
    res.send("<Response><Message>Approval Denied</Message></Response>");
  }
});

// Endpoint to check if approval has been received
app.get("/check-approval", (req, res) => {
  res.json({ approved: smsApproved });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
