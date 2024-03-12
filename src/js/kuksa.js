/*
 * Copyright 2022 Igalia, S.L.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { v4 as uuidv4 } from 'uuid';

const DEFAULT_TARGET = "https://localhost:8888";

// TODO: use an application token when needed
// currently using https://github.com/eclipse/kuksa.val/blob/master/kuksa_certificates/jwt/super-admin.json.token
const TEST_TOKEN = 
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJsb2NhbCBkZXYiLCJpc3MiOiJjcmVhdGVUb2tlbi5weSIsImF1ZCI6WyJrdWtzYS52YWwiXSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3NjcyMjU1OTksInNjb3BlIjoiYWN0dWF0ZSBwcm92aWRlIn0.x-bUZwDCC663wGYrWCYjQZwQWhN1CMuKgxuIN5dUF_izwMutiqF6Xc-tnXgZa93BbT3I74WOMk4awKHBUSTWekGs3-qF6gajorbat6n5180TOqvNu4CXuIPZN5zpngf4id3smMkKOT699tPnSEbmlkj4vk-mIjeOAU-FcYA-VbkKBTsjvfFgKa2OdB5h9uZARBg5Rx7uBN3JsH1I6j9zoLid184Ewa6bhU2qniFt5iPsGJniNsKsRrrndN1KzthO13My44s56yvwSHIOrgDGbXdja_eLuOVOq9pHCjCtorPScgEuUUE4aldIuML-_j397taNP9Y3VZYVvofEK7AuiePTbzwxrZ1RAjK74h1-4ued3A2gUTjr5BsRlc9b7eLZzxLJkrqdfGAzBh_rtrB7p32TbvpjeFP30NW6bB9JS43XACUUm_S_RcyI7BLuUdnFyQDQr6l6sRz9XayYXceilHdCxbAVN0HVnBeui5Bb0mUZYIRZeY8k6zcssmokANTD8ZviDMpKlOU3t5AlXJ0nLkgyMhV9IUTwPUv6F8BTPc-CquJCUNbTyo4ywTSoODWbm3PmQ3Y46gWF06xqnB4wehLscBdVk3iAihQp3tckGhMnx5PI_Oy7utIncr4pRCMos63TnBkfrl7d43cHQTuK0kO76EWtv4ODEHgLvEAv4HA';

/*

const fs = require('fs');

function customLog(message) {
    console.log(message);

    // Specify the path to the log file
    const logFilePath = path.join('/lib/wam_apps/html5-mixer', 'log.txt');

    // Append the message to the log file
    fs.appendFile(logFilePath, message + '\n', function (err) {
        if (err) throw err;
    });
}

*/

var kuksa_context = {
    authToken: TEST_TOKEN,
    client: undefined,
    target: DEFAULT_TARGET,
    subscribe_entries: [],
    subscribe_stream: null,
    locks: new Map()
}

var pathToHandler = null;

function updateVehicleInfo(path, dp) {
    if (!pathToHandler.has(path)) {
        console.log('Handler not found for', path);
        return;
    }

    var handler = pathToHandler.get(path);
    handler.update(path, dp)
}

function send(action, values) {
}

function add_subscribe_entry(path) {
    console.log('Adding subscribe entry for ' + path +  '...')
    var entry = new VAL.SubscribeEntry();
    entry.setPath(path);
    entry.setView(TYPES.View.VIEW_ALL);
    entry.addFields(TYPES.Field.FIELD_PATH);
    entry.addFields(TYPES.Field.FIELD_VALUE);
    kuksa_context.subscribe_entries.push(entry);
}

import fs from 'fs';

function subscribe() {
    if (kuksa_context.client == undefined) {
        console.log("Client not initialized.");
        return;
    }
    var metadata = {'authorization': 'Bearer ' + kuksa_context.authToken };

    var request = new VAL.SubscribeRequest();
    for (var i in kuksa_context.subscribe_entries) {
        var entry = kuksa_context.subscribe_entries[i];
        entry.setView(TYPES.View.VIEW_CURRENT_VALUE);
        request.addEntries(entry);
    }

    kuksa_context.subscribe_stream = kuksa_context.client.subscribe(request, metadata);

    kuksa_context.subscribe_stream.on('data', function(response) {
        var updates = response.getUpdatesList();
        for (var i in updates) {
            var update = updates[i];
            var entry = update.getEntry();
            var path = entry.getPath();
            var dp = entry.getValue();

            if (!(entry && path && dp)) {
                continue;
            }

            lock(path);
            updateVehicleInfo(path, dp);
            unlock(path);

            // Log dp and path values to a file
            fs.appendFile('/lib/wam_apps/html5-mixer/data_log.txt', `Path: ${path}, DP value: ${dp}\n`, function (err) {
                if (err) throw err;
            });
        }
    });

    kuksa_context.subscribe_stream.on('error', function(error) {
        console.log("Error code: " + error.code + " message: " + error.message); 
        // if an error happens here, the databroker will drop the subscriber, so 
        // we need to subscribe again
        subscribe();

        // Log error code and message to a file
        fs.appendFile('/lib/wam_apps/html5-mixer/error_log.txt', `Error code: ${error.code}, Message: ${error.message}\n`, function (err) {
            if (err) throw err;
        });
    });
}

// TODO: investigate why an empty response is always being returned on the
// response
export function get(path) {
    if (kuksa_context.client == undefined) {
        console.log("Client not initialized.");
        return;
    }
    if (isLocked(path)) {
        return;
    }

    var metadata = {'authorization': 'Bearer ' + kuksa_context.authToken };

    var request = new VAL.GetRequest();
    var entry = new VAL.EntryRequest();
    entry.setPath(path);
    entry.setView(TYPES.View.VIEW_ALL);
    entry.addFields(TYPES.Field.FIELD_METADATA);
    entry.addFields(TYPES.Field.FIELD_VALUE);
    request.addEntries(entry);

    kuksa_context.client.get(request, metadata, function(error, response) {
        if (error) {
            console.log("Get error, code: " + error.code);
            return;
        }
        if (!response) {
            return;
        }
        var entries = response.getEntriesList();
        for (var i in entries) {
            var entry = entries[i];
            var path = entry.getPath();
            var dp = entry.getValue();

            if (!(entry && path && dp)) {
                continue;
            }
            lock(path);
            updateVehicleInfo(path, dp);
            unlock(path);
        }
    });
}

export function set(path, dp) {
    if (kuksa_context.client == undefined) {
        console.log("Client not initialized.");
        return;
    }
    if (isLocked(path)) {
        return;
    }
    lock(path);

    var metadata = {'authorization': 'Bearer ' + kuksa_context.authToken };

    var entry = new TYPES.DataEntry();
    entry.setPath(path);
    entry.setValue(dp);
    
    var update = new VAL.EntryUpdate();
    update.addFields(TYPES.Field.FIELD_PATH);
    update.addFields(TYPES.Field.FIELD_VALUE);
    update.setEntry(entry);

    var request = new VAL.SetRequest();
    request.addUpdates(update);

    kuksa_context.client.set(request, metadata, function(error, response) {
        // don't unlock updates here, only when we get a value from 
        // the subscription updates
    });
}

export function init(handlers) {
    console.log("Initializing kuka-val module...");
    pathToHandler = new Map(handlers);
    pathToHandler.forEach(function(handler, path) {
        add_subscribe_entry(path);
    });

    if (kuksa_context.client == undefined) {
        console.log("Creating kuksa-val client...");
        kuksa_context.client = new VAL_WEB.VALClient(kuksa_context.target);

        subscribe();
    }
}

export function setInt32(path, value) {
    var dp = new TYPES.Datapoint();
    dp.setInt32(value);
    set(path, dp);
}

export function setUInt32(path, value) {
    var dp = new TYPES.Datapoint();
    dp.setUint32(value);
    set(path, dp);
}

export function setBool(path, value) {
    var dp = new TYPES.Datapoint();
    dp.setBool(value);
    set(path, dp);
}

export function setString(path, value) {
    var dp = new TYPES.Datapoint();
    dp.setString(value);
    set(path, dp);
}

export function lock(path) {
    kuksa_context.locks[path] = true;
}

export function unlock(path) {
    kuksa_context.locks[path] = false;
}

export function isLocked(path) {
    if (!kuksa_context.locks.has(path)) {
        kuksa_context.locks[path] = false;
    }
    return kuksa_context.locks[path];
}
