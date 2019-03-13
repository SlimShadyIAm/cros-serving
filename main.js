const {
    StringStream
} = require("scramjet");
const request = require("request");
const csv = require('csvtojson');
const Discord = require('discord.js');
const webhookID = process.env.servingID;
const webhookToken = process.env.servingToken;
const csvUrl = "http://cros-updates-serving.appspot.com/csv";

var data;
var tempCsv;

function parseCsv(url) { // this function parses the actual remote CSV file
    tempCsv = {}
    request.get(url)
        .pipe(new StringStream())
        .consume(object => tempCsv += object)
        .then(() => {
            csv({
                    noheader: true,
                    output: "csv"
                })
                .fromString(tempCsv)
                .then((csvRow) => {
                    compareCsv(csvRow)
                })
        });
        // our output (csvRow) looks something like this...
        // [
        //     [1, 2, 3],
        //     [4, 5, 6],
        //     [7, 8, 9]
        // ]
        // we then want to compare the new copy of data
        // to the old copy of the data, to see if we have
        // new updates available
}

function compareCsv(str) {
    if (data == null) {
        data = str;
        console.log("We have no baseline data! Setting now.") // we need something to compare against to see if we have new data
        return;
    } else {
        for (i = 1; i < str.length; i++) { // loop through all lines in the CSV (except first which has headers)
            if (str[i][1] != "True") { // ignore line if this device is EOL
                if (str[i][2] != data[i][2]) { // do we have new data for stable channel?
                    console.log(`Found new update for ${str[i][0]} on ${str[i][2]}`)
                    sendUpdate(str[i][0], str[i][2], "stable");
                }
                if (str[i][32] != data[i][32]) { // do we have new data for beta channel?
                    console.log(`Found new update for ${str[i][0]} on ${str[i][32]}`)
                    sendUpdate(str[i][0], str[i][32], "beta");
                }
                if (str[i][34] != data[i][34]) { // do we have new data for dev channel?
                    console.log(`Found new update for ${str[i][0]} on ${str[i][34]}`)
                    sendUpdate(str[i][0], str[i][34], "dev");
                }
                if (str[i][36] != data[i][36]) { // do we have new data for canary channel?
                    console.log(`Found new update for ${str[i][0]} on ${str[i][36]}`)
                    sendUpdate(str[i][0], str[i][36], "canary");
                }
            }
        }
    }
    data = str;
}

function sendUpdate(device, update, channel) { // function to send an update to Discord
    console.log("Attempting to send...");
    const embed = new Discord.RichEmbed()
        .setAuthor("Cros Updates Serving")
        .setTitle(`New update for ${device}!`)
        .setColor(3172587)
        .setTimestamp()
        .setFooter("Brought to you by http://cros-updates-serving.appspot.com/")
        .setDescription(`${device} has been updated to ${update} on channel ${channel}!`)

    const hook = new Discord.WebhookClient(webhookID, webhookToken);
    hook.send(embed)
}

parseCsv(csvUrl); // run the program once so we get the baseline data, then run every 10 mins
setInterval(function () {
    parseCsv(csvUrl);
}, 100 * 1000);