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
  "+64274476221": false, // Approver 1
  "+64273814842": false, // Approver 2
};

let smsApproved = false; // Global approval status
let approvalTimeout = null; // Timeout handler for resetting approvals
const approvalTimeoutDuration = 15 * 60 * 1000; // 15 minutes

app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Function to reset approvals
const resetApprovals = () => {
  approvals["+64274476221"] = false;
  approvals["+64273814842"] = false;
  smsApproved = false;
  console.log("Approvals have been reset due to timeout or completion.");
};

// Function to check if both approvals are "yes"
const allApproved = (approvals) =>
  approvals["+64274476221"] && approvals["+64273814842"];

// Function to send appropriate Twilio response
const sendResponse = (res, message) => {
  res.send(`<Response><Message>${message}</Message></Response>`);
};

// Send SMS and start the approval timer
app.post("/send-sms", (req, res) => {
  console.log(approvals);
  const date = new Date().toLocaleString("en-NZ", {
    timeZone: "Pacific/Auckland",
  });
  const body = `Your GitHub workflow job for deployment sent a request on ${date} and is waiting for approval. Send "yes" to DEPLOYMENT AGENT to proceed, otherwise send "no".`;
  const from = "+19254758253"; // Twilio number
  const phoneNumbers = ["+64274476221", "+64273814842"];

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

  // Start/reset a timer to reset approvals if no response within 15 minutes
  if (approvalTimeout) clearTimeout(approvalTimeout);
  approvalTimeout = setTimeout(resetApprovals, approvalTimeoutDuration);

  res.status(200).json({ success: true, message: "SMS sent for approval" });
});

// Handle SMS response for approval
app.post("/sms-response", (req, res) => {
  const incomingMessage = req.body.Body.trim().toLowerCase();
  const fromNumber = req.body.From; // Get the number of the person who sent the message

  if (["yes", "no"].includes(incomingMessage)) {
    if (approvals.hasOwnProperty(fromNumber)) {
      // Update approval status for this approver
      approvals[fromNumber] = incomingMessage === "yes";

      // Reset timeout after each response to allow time for both approvals
      if (approvalTimeout) clearTimeout(approvalTimeout);
      approvalTimeout = setTimeout(resetApprovals, approvalTimeoutDuration);

      // Check if both approvals are "yes"
      if (allApproved(approvals)) {
        smsApproved = true;
        clearTimeout(approvalTimeout); // Clear the timeout since both approvals are received
        console.log("Both approvals received.");

        // Send approval SMS to the admin/recipient after both approvals
        const approvalMessage =
          "Both approvers have approved. Deployment is ready to proceed.";
        const adminPhoneNumber = "+64270000000"; // Example admin number

        client.messages
          .create({
            body: approvalMessage,
            from: "+19254758253", // Twilio number
            to: adminPhoneNumber,
          })
          .then((message) => {
            console.log(`Approval message sent to admin: ${message.sid}`);
            resetApprovals(); // Reset approvals after successful message is sent
          })
          .catch((error) => {
            console.error(`Failed to send approval message: ${error}`);
          });
      } else {
        console.log(`Rejected`);
        smsApproved = false;
      }

      sendResponse(res, "Approval received. Thank you!");
    } else {
      sendResponse(res, "You are not authorized to approve.");
    }
  } else {
    sendResponse(res, "Invalid response. Please reply with 'yes' or 'no'.");
  }
});

// Check if both approvals are received
app.get("/check-approval", (req, res) => {
  res.json({ approved: smsApproved });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
