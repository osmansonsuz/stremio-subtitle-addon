const { addonBuilder, serveHTTP, publishToCentral } = require('stremio-addon-sdk');
var express = require("express")
var addon = express()

const builder = new addonBuilder({
  id: 'org.sonsuzanime',
  version: '1.0.0',
  name: 'One Piece Turkce Altyazi(SonsuzAnime)',
  description: 'One Piece Turkce Altyazilari',
  
  types: ['"movie", "series"'],
  catalogs: [],
  resources: ['subtitles']
})

builder.defineSubtitlesHandler(async function(args) {
  const { id } = args;
  console.log("id", id);

  if (id.startsWith("tt0388629")) {
    const { season, episode } = parseId(id);
    console.log("Gelen bölüm: Sezon", season, "Bölüm", episode);



    const subtitle = await fetchSubtitles(season, episode); // await kullanmayı unutmayın
    return Promise.resolve({ subtitles: [subtitle]})
  } else {
    return Promise.resolve({ subtitles: [] })
  }
});


async function fetchSubtitles(season, episode) {
  const subtitles = 
    {
      url: `https://www.sonsuzanime.com/subtitles/onepiece/season${season}/episode${episode}.srt`,
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
  return { season: 0, episode: 0 }; // Eğer eşleşme bulunamazsa varsayılan değerler
}
publishToCentral("https://fdfa3f0d051a-one-piece-turkce-altyazi.baby-beamup.club/manifest.json")

const port = process.env.PORT || 8000;
const address = process.env.ADDRESS || '0.0.0.0';

serveHTTP(builder.getInterface(), { port: port, address: address });
