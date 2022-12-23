const https = require('https');
const WaitingList = require('../models/waitingList');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');



var mailchimpInstance = process.env.MAILCHIMP_INSTANCE,
    listUniqueId = process.env.MAILCHIMP_AUDIENCE_ID,
    mailchimpApiKey = process.env.MAILCHIMP_API_KEY;

const waitingList = catchAsync(async(req, res, next) => {
    var email = req.body.email;
    
    var data = {
        members: [{
            email_address: email,
            status: "subscribed",
            // merge_fields: {
            //     FNAME: firstName,
            //     LNAME: password
            // }
        }]
    }

    // create waiting list instance in the db
    const waitingList = await WaitingList.create({
        email
    });
    // save in the db
    await waitingList.save();

    // Converting string data to JSON data
    const jsonData = JSON.stringify(data);
    const url = `https://us12.api.mailchimp.com/3.0/lists/${listUniqueId}`;
    const options = {
        method: "POST",
        auth: mailchimpApiKey
    }

    // On success send users to success, otherwise on failure template 
    const request = https.request(url, options, function (response) {
        if (response.statusCode === 200) {
            res.send("success");
        } else {
            res.send("failure");
        }
        response.on("data", function (data) {
            //console.log(JSON.parse(data));
        });
    });
    request.write(jsonData);
    request.end();
});

module.exports = {
    waitingList
}