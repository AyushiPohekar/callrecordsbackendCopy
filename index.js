const express = require("express");

const twilio = require("twilio");
const cors = require("cors");
const Connection = require("./db");
const Call = require("./CallSchema");
const dotenv=require("dotenv")
 dotenv.config();
console.log("hi")
// console.log('Environment variables loaded:', process.env);
Connection();
const app = express();

app.use(cors());
app.use(express.json());


 const accountSid = process.env.TWILIO_ACCOUNT_SID;
 const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log(accountSid)
console.log(authToken)
   const client = twilio(accountSid,authToken);


// // app.get("/listRecordings", (req, res) => {
// //   client.recordings
// //     .list({ limit: 20 })
// //     .then((recordings) => {
// //       //recordings.forEach(r => console.log(r.sid));
// //       //res.send(recordings);
// //       // const recordingsWithDurations = recordings.map(r => ({
// //       //    sid: r.sid,
// //       //    duration: r.duration
// //       //  }));
// //       const responseObj = {
// //         count: recordings.length,
// //         recordings: recordings,
// //       };
// //       res.json(responseObj);

// //       //  res.json(recordingsWithDurations);
// //     })
// //     .catch((error) => {
// //       console.error(error);
// //       res.status(500).send(error);
// //     });
// // });

// // app.get("/listAlerts", (req, res) => {
// //   client.monitor.v1.alerts
// //     .list({ limit: 20 })
// //     .then((alerts) => {
// //       alerts.forEach((a) => console.log(a.sid));
// //       res.send("Alerts listed successfully.");
// //     })
// //     .catch((error) => {
// //       console.log(error);
// //       res.status(500).send(error);
// //     });
// // });

// // app.get("/getCallSid/:phoneNumber", (req, res) => {
// //   const phoneNumber = req.params.phoneNumber;

// //   client.calls
// //     .list({
// //       to: phoneNumber,
// //       limit: 1,
// //     })
// //     .then((calls) => {
// //       if (calls.length > 0) {
// //         const callSid = calls[0].sid;

// //         // Use the obtained callSid to fetch recordings
// //         client.recordings
// //           .list({ callSid, limit: 20 })
// //           .then((recordings) => {
// //             recordings.forEach((r) => console.log(r.sid));
// //             res.json({ phoneNumber, callSid, recordings });
// //             //res.json(recordings)
// //           })
// //           .catch((error) =>
// //             res
// //               .status(500)
// //               .json({ error: `Error fetching recordings: ${error.message}` })
// //           );
// //       } else {
// //         res.json({ phoneNumber, callSid: null, recordings: [] });
// //       }
// //     })
// //     .catch((error) =>
// //       res.status(500).json({ error: `Error fetching calls: ${error.message}` })
// //     );
// // });

// //details of particular call
// app.get("/getCallDetails/:phoneNumber", (req, res) => {
//   const phoneNumber = req.params.phoneNumber;

//   client.calls
//     .list({
//       to: phoneNumber,
//       limit: 1,
//     })
//     .then((calls) => {
//       if (calls.length > 0) {
//         const callSid = calls[0].sid;

//         client
//           .calls(callSid)
//           .fetch()
//           .then((call) => res.json(call))
//           .catch(
//             (error) =>
//               res.status(500).json({
//                 error: `Error fetching call details: ${error.message}`,
//               }) // Corrected the error message
//           );
//       } else {
//         res.json([]);
//       }
//     })
//     .catch((error) =>
//       res.status(500).json({ error: `Error fetching calls: ${error.message}` })
//     );
// });

function formatDateTime(date) {
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  };
  return new Date(date).toLocaleString("en-US", options);
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
      Date:formatDateTime(new Date(call.dateCreated))
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
          ${newCalls.map(call => `
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
          `).join('')}
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

const PORT = 5000;

app.listen(PORT, () => {

  console.log(`Server is running on port ${PORT}`);
});
