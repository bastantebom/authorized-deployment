require("dotenv").config();
const express = require("express");
const twilio = require("twilio");
const app = express();
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = new twilio(accountSid, authToken);
const bodyParser = require("body-parser");

const port = process.env.PORT || 3000;

// Track approvals
let approvals = {
  "+64274476221": 0, // 0 = no response, 1 = approved, 2 = rejected
  "+64274219908": 0,
};

let smsApproved = 0; // 0 = incomplete, 1 = complete, 2 = rejected
let approvalTimeout = null; // Timeout handler for resetting approvals
const approvalTimeoutDuration = 10 * 60 * 1000; // 15 minutes

app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Function to reset approvals
const resetApprovals = () => {
  approvals["+64274476221"] = 0;
  approvals["+64274219908"] = 0;
  smsApproved = 0;
  console.log("Approvals have been reset due to timeout.");
};

// Function to check if both approvals are "yes"
const allApproved = (approvals) =>
  approvals["+64274476221"] === 1 && approvals["+64274219908"] === 1;

const incomplete = (approvals) =>
  approvals["+64274476221"] === 0 || approvals["+64274219908"] === 0;

const rejected = (approvals) =>
  approvals["+64274476221"] === 2 || approvals["+64274219908"] === 2;

// Function to send appropriate Twilio response
const sendResponse = (res, message) => {
  res.send(`<Response><Message>${message}</Message></Response>`);
};

// Send SMS and start the approval timer
app.post("/send-sms", (req, res) => {
  const date = new Date().toLocaleString("en-NZ", {
    timeZone: "Pacific/Auckland",
  });
  const body = `Your github workflow job for deployment sent request on  ${date} and is waiting for approval. Send "yes" to DEPLOYMENT AGENT to proceed, otherwise send "no"`;
  const from = "+19254758253"; // Twilio number
  const phoneNumbers = ["+64274476221", "+64274219908"];

  // Send SMS to both approvers
  phoneNumbers.forEach((number) => {
    client.messages
      .create({
        body,
        from,
        to: number, // Recipient's phone number
      })
      .then((message) => {
        console.log(`Message sent to ${number}: ${message.sid}`);
      })
      .catch((error) => console.error(`Failed to send to ${number}: ${error}`));
  });

  resetApprovals();
  // Start a timer to reset approvals if no response in 15 minutes
  approvalTimeout = setTimeout(() => {
    resetApprovals();
  }, approvalTimeoutDuration);

  res.status(200).json({ success: true, message: "SMS sent for approval" });
});

// Handle SMS response for approval
app.post("/sms-response", (req, res) => {
  const incomingMessage = req.body.Body.trim().toLowerCase();
  const fromNumber = req.body.From; // Get the number of the person who sent the message

  if (["yes", "no"].includes(incomingMessage)) {
    if (approvals.hasOwnProperty(fromNumber)) {
      // Update approval status for this approver
      approvals[fromNumber] = incomingMessage === "yes" ? 1 : 2;

      // Check if both approvals are "yes"
      if (allApproved(approvals)) {
        smsApproved = 1;
        clearTimeout(approvalTimeout); // Clear the timeout since both responses are received
        console.log("Both approvals received.");
        sendResponse(res, "Approval received. Thank you!");
      } else if (rejected(approvals)) {
        smsApproved = 2;
        clearTimeout(approvalTimeout); // Clear the timeout since already rejected
        console.log("Approval rejected.");
        sendResponse(res, "Your approval was rejected.");
      } else if (incomplete(approvals)) {
        smsApproved = 0;
        sendResponse(res, "Approval received, waiting for the other approver.");
      }
    } else {
      sendResponse(res, "You are not authorized to approve.");
    }
  } else {
    sendResponse(res, "Invalid response. Please reply with 'yes' or 'no'.");
  }
});

// Check if both approvals are received
app.get("/check-approval", (req, res) => {
  res.json({ status: smsApproved });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
