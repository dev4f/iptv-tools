#! /usr/bin/env node

import {M3uParser} from 'm3u-parser-generator';
import { readFileSync } from 'fs';
import { Command } from 'commander';
import request from 'sync-request';

const program = new Command()
program
  .requiredOption('--path <config>', 'Path to m3u')
  .requiredOption('--mapping <mapping>', 'Name to id mapping json file')
  .option('--replace <replace>', 'Replace existing id', false)
  .parse(process.argv)

const options = program.opts()
console.log("Opts: ", options)

function loadM3u(path) {
    if (!path) throw new Error('Path is missing')
    if (path.indexOf("http") == 0) {
        return request('GET', path).getBody('utf8');
    } else {
        return readFileSync(path).toString('utf8');
    }
}

const m3u = loadM3u(options.path)
const playlist = M3uParser.parse(m3u, true);
const mapping = JSON.parse(readFileSync(options.mapping, 'utf8'));

playlist.medias.forEach(media => {
    let id = getIdForName(media.name)
    if (id) {
        if (options.replace) {
            media.attributes["tvg-id"] = id
        } else if (!media.attributes["tvg-id"]) {
            media.attributes["tvg-id"] = id
        }
    }
});

function getIdForName(channelName) {
    if (!channelName) {
        return ""
    }
    for (const [name, id] of Object.entries(mapping)) {
        if (channelName.toLowerCase().indexOf(name.toLowerCase()) >= 0) {
            return id;
        }      
    }
    return ""
}

const m3uString = playlist.getM3uString();

console.log(m3uString)