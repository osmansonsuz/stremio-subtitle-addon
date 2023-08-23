const { addonBuilder, serveHTTP, publishToCentral } = require('stremio-addon-sdk');
var express = require("express")
var addon = express()
var mysql = require('mysql');
var http = require("https");



var con = mysql.createConnection({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  database: process.env.database
});

const builder = new addonBuilder({
  id: 'org.sonsuzanime',
  version: '1.0.0',
  name: 'Anime Turkce Altyazi(SonsuzAnime)',
  description: 'Turkce Altyazilari Senkron Sorunu İstek Altyazi İçin infinity@sonsuzanime.com',
  
  types: ['series','anime','movie'],
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
  //bleachsennen2.sezon
  else if(id.startsWith("kitsu:46903")){
    const parts = id.split(':');
    let episode = null
    if (parts.length >= 3) {
        episode = parts[2];

    } else {
        console.log('Geçersiz ID formatı.');
    }
    console.log("Gelen bölüm: Sezon", 1, "Bölüm", episode);



    const subtitle = await fetchSubtitles("bleachsennen2",1, episode);
    return Promise.resolve({ subtitles: [subtitle]})
  }
  //Ahsoka
  else if(id.startsWith("tt13622776")){
    const { season, episode } = parseId(id);
    console.log("Gelen bölüm: Sezon", season, "Bölüm", episode);



    const subtitle = await fetchSubtitles("ahsoka",season, episode);
    return Promise.resolve({ subtitles: [subtitle]})
  }
  else {
    let imdbid=null;
    if(id.startsWith("tt")){
      const parts = id.split(':');
      if (parts.length >= 1) {
        imdbid = parts[0];

      } else {
          console.log('Geçersiz ID formatı.');
      }
    }
    else if(id.startsWith("kitsu")){
      const parts = id.split(':');
      if (parts.length >= 1) {
        imdbid = "kitsu:"+parts[1];

      } else {
          console.log('Geçersiz ID formatı.');
      }
    }
    else if(id.startsWith("pt")){
      const parts = id.split(':');
      if (parts.length >= 1) {
        imdbid = "pt:"+parts[1];

      } else {
          console.log('Geçersiz ID formatı.');
      }
    }
    else if(id.startsWith("anime4up_id")||id.startsWith("consumet")||id.startsWith("wecima_id")||id.startsWith("akwam")){
      imdbid=null;
    }
    
    if (imdbid != null) {
      const checkQuery = `SELECT * FROM requests WHERE series_imdbid = ?`;

      con.query(checkQuery, [imdbid], function (err, results) {
        if (err) throw err;
    
        if (results.length === 0) {
          const insertQuery = `INSERT INTO requests (series_imdbid, count) VALUES (?, 1)`;
          con.query(insertQuery, [imdbid], function (err, result) {
            if (err) throw err;
            console.log("Seri veritabanına eklendi.");
          });
        } else {
          const updateQuery = `UPDATE requests SET count = count + 1 WHERE series_imdbid = ?`;
          con.query(updateQuery, [imdbid], function (err, result) {
            if (err) throw err;
            console.log("Seri sayısı güncellendi.");
          });
        }
        
      });
    }
    return Promise.resolve({ subtitles: [] });
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