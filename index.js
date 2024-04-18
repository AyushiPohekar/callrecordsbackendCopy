const express = require("express");

const twilio = require("twilio");
const cors = require("cors");
const Connection = require("./db");
const Call = require("./CallSchema");
const dotenv = require("dotenv");
dotenv.config();
console.log("hi");
// console.log('Environment variables loaded:', process.env);
Connection();
const app = express();

app.use(cors());
app.use(express.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log(accountSid);
console.log(authToken);
const client = twilio(accountSid, authToken);
console.log(client)
// //get all calls of particular number
function formatDateTime(date) {
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC", // Convert to UTC time
  };

  const originalDate = new Date(date)
    .toLocaleString("en-US", options)
    .replace(/,/g, "");
  let parsedDate = new Date(originalDate);
  let formattedDate = parsedDate.toISOString().split("T")[0];

  return formattedDate;
}
app.get("/listCalls/:phoneNumber", async (req, res) => {
  try {
    const phoneNumber = req.params.phoneNumber;

    // Fetch calls made to or from the specified phone number
    const calls = await client.calls.list({
      to: phoneNumber,
      //from: phoneNumber,
      limit: 20,
    });

    // Extract relevant details and format the response
    const callDetails = calls.map((call) => ({
      sid: call.sid,
      status: call.status,
      direction: call.direction,
      to: call.to,
      from: call.from,
      startTime: formatDateTime(new Date(call.startTime)),
      endTime: formatDateTime(new Date(call.endTime)),
      duration: call.duration,
      Date: formatDateTime(new Date(call.startTime)),
    }));

    const newCalls = await Promise.all(
      callDetails.map(async (detail) => {
        const existingCall = await Call.findOne({ sid: detail.sid });

        if (!existingCall) {
          return Call.create(detail);
        }

        return existingCall;
      })
    );

    const htmlTable = `
    <html>
      <head>
        <style>
          table {
            font-family: Arial, sans-serif;
            border-collapse: collapse;
            width: 100%;
          }

          th, td {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
          }

          th {
            background-color: #f2f2f2;
          }
        </style>
      </head>
      <body>
        <h2>Call Details for Phone Number ${phoneNumber}</h2>
        <table>
          <tr>
            <th>SID</th>
            <th>Status</th>
            <th>Direction</th>
            <th>To</th>
            <th>From</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Duration</th>
            <th>Date</th>
          </tr>
          ${newCalls
            .map(
              (call) => `
            <tr>
              <td>${call.sid}</td>
              <td>${call.status}</td>
              <td>${call.direction}</td>
              <td>${call.to}</td>
              <td>${call.from}</td>
              <td>${call.startTime}</td>
              <td>${call.endTime}</td>
              <td>${call.duration}</td>
              <td>${call.Date}</td>
            </tr>
          `
            )
            .join("")}
        </table>
      </body>
    </html>
  `;

    res.json(newCalls);
  } catch (error) {
    console.error("Error fetching call details:", error.message);
    res
      .status(500)
      .json({ error: `Error fetching call details: ${error.message}` });
  }
});

app.get("/listCallsByDate/:phoneNumber", async (req, res) => {
  try {
    const phoneNumber = req.params.phoneNumber;

    const callsto = await client.calls.list({
      to: phoneNumber,
      
    });
    const callfrom = await client.calls.list({
      from: phoneNumber,
      
    });

    const calls=[...callsto, ...callfrom]

    const callDetails = calls.map((call) => ({
      sid: call.sid,
      status: call.status,
      direction: call.direction,
      to: call.to,
      from: call.from,

      startTime: formatDateTime(new Date(call.startTime)),
      endTime: formatDateTime(new Date(call.endTime)),
      duration: call.duration,
      datecreated: formatDateTime(call.startTime),
    }));

    const newCalls = await Promise.all(
      callDetails.map(async (detail) => {
        const existingCall = await Call.findOne({ sid: detail.sid });

        if (!existingCall) {
          return Call.create(detail);
        }

        return existingCall;
      })
    );

    const startDate = req.query.start_date
      ? new Date(req.query.start_date)
      : null;

    const endDate = req.query.end_date ? new Date(req.query.end_date) : null;

    const filteredCalls = newCalls.filter((call) => {
      const callDate = call.startTime;

      return (
        (!startDate || callDate >= startDate) &&
        (!endDate || callDate <= endDate)
      );
    });
    

    res.send(filteredCalls);
    console.log(filteredCalls.length);
  } catch (error) {
    console.error("Error fetching call details:", error.message);
    res
      .status(500)
      .json({ error: `Error fetching call details: ${error.message}` });
  }
});

app.get("/listCallsforclient", async (req, res) => {
  try {
    const calls = await client.calls.list({});

    const callDetails = calls.map((call) => ({
      sid: call.sid,
      status: call.status,
      direction: call.direction,
      to: call.to,
      from: call.from,
      
      startTime: formatDateTime(new Date(call.startTime)),
      endTime: formatDateTime(new Date(call.endTime)),
      duration: call.duration,
      datecreated: formatDateTime(call.startTime),
    }));

 

    const newCalls = await Promise.all(
      callDetails.map(async (detail) => {
        const existingCall = await Call.findOne({ sid: detail.sid });

        if (!existingCall) {
          return Call.create(detail);
        }

        return existingCall;
      })
    );

    const startDate = req.query.start_date
      ? new Date(req.query.start_date)
      : null;

    const endDate = req.query.end_date ? new Date(req.query.end_date) : null;

    const filteredCalls = newCalls.filter((call) => {
      const callDate = call.Date;

      return (
        (!startDate || callDate >= startDate) &&
        (!endDate || callDate <= endDate)
      );
    });

    res.send(calls);
    console.log(callDetails.length);
  } catch (error) {
    console.error("Error fetching call details:", error.message);
    res
      .status(500)
      .json({ error: `Error fetching call details: ${error.message}` });
  }
});

const PORT = 5000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Set timeout to 2 minutes (120000 milliseconds)
server.timeout = 120000;