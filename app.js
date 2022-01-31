const fs = require('fs');
const ytdl = require('ytdl-core');
const express = require('express');
const bodyParser = require('body-parser')
const path = require("path");
const {exec} = require("child_process");
const app = express()
const port = 3000


let urlencodedParser = bodyParser.urlencoded({extended: false})

let progress1, progress2, aProg1, aProg2;
let stream, aStream;
let finish = false;
let started = false;
let aStarted = false;
let aFinished = false;
let convertFinished = false;
let videoTitle = undefined;
let error = false;
let audioConvert = false;

app.set('view engine', 'pug');

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'static/index.html'));
})

app.post("/download", urlencodedParser, function (req, res) {
    error = false;
    delete 'video.mp4';

    ytdl.getInfo(req.body.url).then(info => {
        videoTitle = info['player_response']['videoDetails']['title'];
        console.log("Quality: " + req.body.quality);
        stream = ytdl.downloadFromInfo(info, {quality: req.body.quality});
        stream.pipe(fs.createWriteStream('video.mp4'));

        stream.on("progress", function (n1, n2, n3) {
            if (!started) started = true;
            console.log("Progress: " + n1 + " " + n2 + " " + n3 + " " + (n2 / n3) * 100);
            progress1 = n2;
            progress2 = n3;
        });

        stream.on("finish", function () {
            console.log("Finished");
            finish = true;
        })

        console.log("Starting dl");
        res.redirect("/status");
    });
})

app.get("/progress", function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    let arr = {};

    arr['p1'] = progress1;
    arr['p2'] = progress2;
    arr['pp'] = (progress1 / progress2) * 100;
    arr['ap1'] = aProg1;
    arr['ap2'] = aProg2;
    arr['app'] = (aProg1 / aProg2) * 100;

    if (audioConvert) {
        arr['audioConvert'] = true;
    }

    if (finish) {
        arr['status'] = "finished";
    } else if (started) {
        arr['status'] = "downloading";
    } else {
        arr['status'] = "notStarted";
    }

    if (aFinished) {
        arr['aStatus'] = "finished";
    } else if (aStarted) {
        arr['aStatus'] = "downloading";
    } else {
        arr['aStatus'] = "notStarted";
    }

    if (convertFinished) {
        arr['convertStatus'] = "finished";
    } else {
        arr['convertStatus'] = "notYet";
    }

    arr['title'] = videoTitle;
    arr['error'] = error;

    res.send(JSON.stringify(arr));
})

app.get("/status", function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'static/status.html'));
})

app.get("/multiStatus", function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'static/multiStatus.html'));
})

app.get("/video", function (req, res) {
    finish = false;
    started = false;
    res.sendFile(path.join(__dirname, 'video.mp4'));
})

app.get("/splitVideo", function (req, res) {
    finish = false;
    started = false;
    aFinished = false;
    aStarted = false;
    convertFinished = false;
    res.sendFile(path.join(__dirname, 'output.mp4'));
})

app.get("/audioFile", function (req, res) {
    finish = false;
    started = false;
    aFinished = false;
    aStarted = false;
    convertFinished = false;
    audioConvert = false;
    res.sendFile(path.join(__dirname, 'audio.mp3'));
})

app.post("/advanced", urlencodedParser, function (req, res) {
    error = false;
    console.log("Getting INFO from " + req.body.url);
    ytdl.getInfo(req.body.url).then(r => {
        console.log(r);
        res.render("advanced.jade", {array: r, title: r['player_response']['videoDetails']['title'], url: req.body.url})
    });
})

app.post("/downloadAdvanced", urlencodedParser, function (req, res) {
    ytdl.getInfo(req.body.url).then(info => {
        let format = ytdl.chooseFormat(info.formats, {quality: req.body.itag});
        console.log('Format found!', format);
        stream = ytdl.downloadFromInfo(info, {quality: req.body.itag});

        delete 'video.mp4';
        stream.pipe(fs.createWriteStream('video.mp4'));

        stream.on("progress", function (n1, n2, n3) {
            if (!started) started = true;
            console.log("Advanced Progress: " + n1 + " " + n2 + " " + n3 + " " + (n2 / n3) * 100);
            progress1 = n2;
            progress2 = n3;
        });

        stream.on("finish", function () {
            console.log("Finished");
            finish = true;
        })

        console.log("Starting advanced dl");
        res.redirect("/status");
    });

})

app.post("/multiDL", urlencodedParser, function (req, res) {
    //res.send(req.body.url + " " + req.body.videoItag + " " + req.body.audioItag)
    videoTitle = req.body.title;

    fs.unlink('output.mp4', (err) => {
        if (err) console.log("output.mp4 does not exist!");
        console.log('output.mp4 was deleted');
    });
    fs.unlink('splitVideo', (err) => {
        if (err) console.log("splitVideo does not exist!");
        console.log('splitVideo was deleted');
    });
    fs.unlink('splitAudio', (err) => {
        if (err) console.log("splitAudio does not exist!");
        console.log('splitAudio was deleted');
    });


    ytdl.getInfo(req.body.url).then(info => {
        stream = ytdl.downloadFromInfo(info, {quality: req.body.videoItag});
        aStream = ytdl.downloadFromInfo(info, {quality: req.body.audioItag});

        stream.pipe(fs.createWriteStream('splitVideo'));
        aStream.pipe(fs.createWriteStream('splitAudio'));

        stream.on("progress", function (n1, n2, n3) {
            if (!started) started = true;
            console.log("Video Progress: " + n1 + " " + n2 + " " + n3 + " " + (n2 / n3) * 100);
            progress1 = n2;
            progress2 = n3;
        });

        aStream.on("progress", function (n1, n2, n3) {
            if (!aStarted) aStarted = true;
            console.log("Audio Progress: " + n1 + " " + n2 + " " + n3 + " " + (n2 / n3) * 100);
            aProg1 = n2;
            aProg2 = n3;
        });

        stream.on("finish", function () {
            console.log("Video Finished");
            finish = true;
            console.log(checkReady());
        })

        aStream.on("finish", function () {
            console.log("Audio Finished");
            aFinished = true;
            console.log(checkReady());
        })


    })


    res.redirect("/multiStatus");

})


app.listen(port, () => {
    console.log('Example app listening on port ${port}')
})

process.on('uncaughtException', err => {
    console.error('There was an uncaught error', err)
    error = true;
})


// ---------- Audio Conversion ----------

app.post("/audio", urlencodedParser, function (req, res) {
    error = false;

    // delete audio file if exists
    fs.unlink('audio.mp3', (err) => {
        if (err) console.log("audio does not exist!");
        console.log('audio.mp3 was deleted');
    });
    fs.unlink('audio', (err) => {
        if (err) console.log("audio does not exist!");
        console.log('audio was deleted');
    });

    ytdl.getInfo(req.body.url).then(info => {
        videoTitle = info['player_response']['videoDetails']['title'];

        let itag = findBestFormat("AUDIO_QUALITY_HIGH", info);
        if (itag === -1) {
            itag = findBestFormat("AUDIO_QUALITY_MEDIUM", info);
        }
        if (itag === -1) {
            findBestFormat("AUDIO_QUALITY_LOW", info);
        }

        //res.send("Best should be: " + itag);

        // find best audio

        stream = ytdl.downloadFromInfo(info, {quality: itag});
        stream.pipe(fs.createWriteStream('audio'));

        stream.on("progress", function (n1, n2, n3) {
            if (!started) started = true;
            audioConvert = true;
            aStarted = true;
            finish = false;
            aFinished = false;
            convertFinished = false;

            console.log("Audio (" + itag + ") Progress: " + n1 + " " + n2 + " " + n3 + " " + (n2 / n3) * 100);
            aProg1 = n2;
            aProg2 = n3;
        });

        stream.on("finish", function () {
            console.log("Finished");
            aFinished = true;
            progress1 = 1;
            progress2 = 1;
            finish = true;

            console.log("Converting to audio.mp3");
            const command = "ffmpeg -i audio -vn -ar 44100 -ac 2 -b:a 192k audio.mp3";

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return;
                }
                convertFinished = true;
                console.log(`stdout: ${stdout}`);
                console.error(`stderr: ${stderr}`);
            })

        })

        console.log("Starting dl");

        res.redirect("/multiStatus");

    });
})


function findBestFormat(qualityLabel, info) {
    let formats = info['formats'];
    for (i in formats) {
        let f = formats[i];

        if (f.mimeType.startsWith('audio/')) {
            if (f.audioQuality === qualityLabel) {
                return f.itag;
            }
        }

    }
    return -1;
}


function checkReady() {
    if (finish && aFinished) {

        console.log("Starting combine")

        const command = "ffmpeg -i splitVideo -i splitAudio -c:v copy -c:a aac output.mp4";

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            convertFinished = true;
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        })

        return true;
    } else {
        return false;
    }
}
