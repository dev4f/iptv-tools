#! /usr/bin/env node

import {M3uParser} from 'm3u-parser-generator';
import { readFileSync, writeFileSync } from 'fs';
import { Command } from 'commander';
import request from 'sync-request';

const program = new Command()
program
  .requiredOption('--path <config>', 'Path to m3u')
  .requiredOption('--mapping <mapping>', 'Name to id mapping json file')
  .option('--mode <mode>', 'Running mode', 'set-tvg-id')
  .option('-o, --output <output>', 'Output path', 'tmp/playlist.m3u')
  // Mode set-tvg-id
  .option('--replace <replace>', 'Replace existing id', false)
  .parse(process.argv)

const options = program.opts()
console.log("Opts: ", options)

function loadFileOrUrl(path) {
    if (!path) throw new Error('Path is missing')
    if (path.indexOf("http") == 0) {
        return request('GET', path).getBody('utf8');
    } else {
        return readFileSync(path).toString('utf8');
    }
}

const m3u = loadFileOrUrl(options.path)
const playlist = M3uParser.parse(m3u, true);

function getIdForName(channelName) {
    const mapping = JSON.parse(readFileSync(options.mapping, 'utf8'));
    if (!channelName) {
        return ""
    }
    for (const [name, id] of Object.entries(mapping)) {
        if (channelName.toLowerCase().indexOf(name.toLowerCase()) >= 0) {
            return id;
        }      
    }
    console.log(`Channel for ${channelName} id not found.`)
    return ""
}

function setTvgId() {
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
    const m3uString = playlist.getM3uString();
    writeFileSync(options.output, m3uString)
    console.log("Set tvg-id done. Output file: ", options.output)
}

function main() {
    if (options.mode === 'set-tvg-id') {
        setTvgId()
    }
}

main()