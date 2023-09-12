#! /usr/bin/env node

import {M3uParser} from 'm3u-parser-generator';
import { readFileSync, writeFileSync } from 'fs';
import { Command } from 'commander';
import request from 'sync-request';
import { exec } from "child_process";

const program = new Command()
program
  .requiredOption('--mode <mode>', 'Running mode', 'set-tvg-id')
  .requiredOption('-o, --output <output>', 'Output path')
  
  // Mode set-tvg-id
  .option('--path <config>', 'Path to m3u')
  .option('--mapping <mapping>', 'Name to id mapping json file')
  .option('--replace <replace>', 'Replace existing id', false)

  // Mode build-epg
  .option('--epg-config <epgconfig>', 'Epg config.js')
  .option('--epg-channels <epgchannels>', 'Epg channel.js')
  .option('--days <days>', 'Number of days for which to grab the program', 5)
  .option('--timezone <timezone>', 'Set timezone', 'Etc/UCT')
  .option(
    '--max-connections <maxConnections>',
    'Set a limit on the number of concurrent requests per site',
    1
  )
  .parse(process.argv)

const options = program.opts()
console.log("Opts: ", options)

function loadFileOrUrl(path) {
    if (!path) throw new Error('Path is missing')
    if (path.indexOf("http") === 0) {
        return request('GET', path).getBody('utf8');
    } else {
        return readFileSync(path).toString('utf8');
    }
}

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
    return ""
}

function setTvgId() {
    const m3u = loadFileOrUrl(options.path)
    const playlist = M3uParser.parse(m3u, true);
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

function buildEpg() {

    let configData = loadFileOrUrl(options.epgConfig);
    let channelsData = loadFileOrUrl(options.epgChannels);
    writeFileSync("/tmp/site.config.js", configData)
    writeFileSync("/tmp/site.channels.xml", channelsData)
    let run_command = `npx epg-grabber --config=/tmp/site.config.js --channels=/tmp/site.channels.xml --output=${options.output} --days=${options.days} --max-connections=${options.maxConnections} --timezone=${options.timezone}`
    console.log(run_command)
}

function main() {
    if (options.mode === 'set-tvg-id') {
        setTvgId()
    }
    if (options.mode === 'build-epg') {
        buildEpg()
    }
}

main()