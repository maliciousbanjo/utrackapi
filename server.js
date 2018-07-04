var express = require('express');
var request = require('request');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var https = require('https');

require('dotenv').config();

var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;
var redirect_uri = process.env.REDIRECT_URI;

var stateKey = 'spotify_auth_state';

// Create the server instance
var app = express();
app.use(cookieParser());
app.use(express.json());
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:8100");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
  });

/**
 * Root-level page info
 */
app.get('/', function (req, res) {
    var output = 'Name: uTrackAPI\nVersion: 1.0.0\nDeveloper: Joseph Billstrom';
    res.end(output);
});


// /**
//  * Return the API version
//  */
// app.get('/info', function (req, res) {
//     res.end(JSON.stringify({version: '1.0.0'}));
// });

/**
 * Generate the Spotify OAuth URL, redirect
 */
app.get('/oauth', function (req, res) {
    var state = 'state';
    res.cookie(stateKey, state);

    // Application requests authorization
    var scope = 'user-top-read';
    res.redirect('https://accounts.spotify.com/authorize?'+
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state,
            show_dialog: 'true'
        }));
});

app.get('/oauthv2', function (req, res) {
    var state = 'state';
    res.cookie(stateKey, state);

    // Application requests authorization
    var scope = 'user-top-read playlist-modify-public';
    res.redirect('https://accounts.spotify.com/authorize?'+
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state,
            show_dialog: 'true'
        }));
})

/**
 * Receive the callback response from Spotify accounts services
 */
app.post('/getTokens', function (req, res) {
    var code = req.body.code || null;
    var state = req.body.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' + 
            querystring.stringify({
                error: 'state_mismatch'
            }));
    }
    else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };
    }

    // Get the access and refresh tokens
    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            var refresh_token = body.refresh_token;

            var options = {
                url: 'https://api.spotify.com/v1/me',
                headers: { 'Authorization': 'Bearer ' + access_token},
                json: true
            };

            request.get(options, function(error, response, body) {
                console.log(body);
            });

            // Pass the Spotify body to the client
            res.end(JSON.stringify(body));
        }
        else {
            console.log(JSON.stringify(error));
        }
    })
});

app.post('/refreshToken', function (req, res) {
    var refresh_token = req.body.refresh_token || null;

    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        headers: {
            'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        json: true
    };

    // Get the access and refresh tokens
    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;

            var options = {
                url: 'https://api.spotify.com/v1/me',
                headers: { 'Authorization': 'Bearer ' + access_token},
                json: true
            };

            request.get(options, function(error, response, body) {
                console.log(body);
            });

            // Pass the Spotify body to the client
            res.end(JSON.stringify(body));
        }
        else {
            console.log(JSON.stringify(error));
            res.end(JSON.stringify(body));
        }
    })
});

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

var server = app.listen(server_port, server_ip_address, function () {
    console.log("Server running at " + server_ip_address + ", port " + server_port);
});

// var server = app.listen(8080, function () {
//     var host = server.address().address;
//     var port = server.address().port;
//     console.log('Server running at', server.address());
// })