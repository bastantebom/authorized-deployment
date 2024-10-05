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
  const date = new Date().toLocaleString("en-NZ", {
    timeZone: "Pacific/Auckland",
  });

  client.messages
    .create({
      body: `Your Jenkins job sent request on  ${date} and  is waiting for approval. Reply "yes" to DEPLOYMENT AGENT to proceed, otherwise reply "no"`,
      from: "+19254758253", // Your Twilio phone number
      to: "+64274476221", // Recipient's phone number
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

app.post("/sms-response", (req, res) => {
  const incomingMessage = req.body.Body.trim().toLowerCase();
  if (incomingMessage === "approved") {
    smsApproved = true;
    res.send("<Response><Message>Approval Received</Message></Response>");
  } else {
    res.send("<Response><Message>Approval Denied</Message></Response>");
  }
});

app.get("/check-approval", (req, res) => {
  res.json({ approved: smsApproved });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
