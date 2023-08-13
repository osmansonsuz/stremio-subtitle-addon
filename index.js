const { addonBuilder, serveHTTP, publishToCentral } = require('stremio-addon-sdk');
var express = require("express")
var addon = express()
const https = require('https')

setInterval(() => {
	https.get('https://my-project.glitch.me/manifest.json')
}, 299000)

const builder = new addonBuilder({
  id: 'org.sonsuzanime',
  version: '1.0.0',
  name: 'Anime Turkce Altyazi(SonsuzAnime)',
  description: 'Turkce Altyazilari Senkron Sorunu İstek Altyazi İçin infinity@sonsuzanime.com',
  
  types: ['series'],
  catalogs: [],
  resources: ['subtitles']
})

builder.defineSubtitlesHandler(async function(args) {
  const { id } = args;
  console.log("id", id);
  //one piece
  if (id.startsWith("tt0388629")) {
    const { season, episode } = parseId(id);
    console.log("Gelen bölüm: Sezon", season, "Bölüm", episode);



    const subtitle = await fetchSubtitles("onepiece",season, episode);
    return Promise.resolve({ subtitles: [subtitle]})
  }

  //the big bang theory
  else if(id.startsWith("tt0898266")){
    const { season, episode } = parseId(id);
    console.log("Gelen bölüm: Sezon", season, "Bölüm", episode);



    const subtitle = await fetchSubtitles("thebigbangtheory",season, episode);
    return Promise.resolve({ subtitles: [subtitle]})
  }

  //spy x family
  else if(id.startsWith("tt13706018")){
    const { season, episode } = parseId(id);
    console.log("Gelen bölüm: Sezon", season, "Bölüm", episode);



    const subtitle = await fetchSubtitles("spyxfamily",season, episode);
    return Promise.resolve({ subtitles: [subtitle]})
  }
  else {
    return Promise.resolve({ subtitles: [] })
  }
});


async function fetchSubtitles(anime,season, episode) {
  const subtitles = 
    {
      url: `https://www.sonsuzanime.com/subtitles/${anime}/season${season}/episode${episode}.srt`,
      lang: "Türkçe",
    };

  console.log("Altyazılar", subtitles);
  return subtitles;
}


function parseId(id) {
  const match = id.match(/tt(\d+):(\d+):(\d+)/);
  if (match) {
    const [, , season, episode] = match;
    return { season: Number(season), episode: Number(episode) };
  }
  return { season: 0, episode: 0 };
}
publishToCentral("https://fdfa3f0d051a-one-piece-turkce-altyazi.baby-beamup.club/manifest.json")

const port = process.env.PORT || 8000;
const address = process.env.ADDRESS || '0.0.0.0';

serveHTTP(builder.getInterface(), { port: port, address: address });