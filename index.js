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
  name: 'Turkce Altyazi(SonsuzAnime)',
  description: 'Turkce Altyazilari Senkron Sorunu İstek Altyazi İçin infinity@sonsuzanime.com',
  
  types: ['series','anime','movie'],
  catalogs: [],
  resources: ['subtitles']
})

builder.defineSubtitlesHandler(async function(args) {
  const { id } = args;
  console.log("id", id);
  let imdbid = null;
  

  if(id.startsWith("tt") ||id.startsWith("kitsu") ||id.startsWith("pt")){
    
    if (id.startsWith("tt")) {
      const parts = id.split(':');
      if (parts.length >= 1) {
        imdbid = parts[0];
      } else {
        console.log('Geçersiz ID formatı.');
      }
    } else if (id.startsWith("kitsu")) {
      const parts = id.split(':');
      if (parts.length >= 1) {
        imdbid = "kitsu:" + parts[1];
      } else {
        console.log('Geçersiz ID formatı.');
      }
    } else if (id.startsWith("pt")) {
      const parts = id.split(':');
      if (parts.length >= 1) {
        imdbid = "pt:" + parts[1];
      } else {
        console.log('Geçersiz ID formatı.');
      }
    }
    else{
      imdbid = null;
    }
  }
  //tt,pt,kitsudan birisiyse burası çalışacak
  if (imdbid != null) {
    const query = `SELECT * FROM series WHERE series_imdbid = ?`;
  
    try {
      const results = await new Promise((resolve, reject) => {
        con.query(query, [imdbid], function (err, results) {
          if (err) {
            console.error("Veritabanı hatası:", err);
            reject(err);
          } else {
            resolve(results);
          }
        });
      });
  
      if (results.length > 0) {
        const seriesName = results[0].series_path;
        const { season, episode } = parseId(id);
        console.log("Gelen bölüm: Sezon", season, "Bölüm", episode);
        
        try {
          subtitle = await fetchSubtitles(seriesName, season, episode);
          
          if (subtitle !== null) {
            return Promise.resolve({ subtitles: [subtitle] });
          } else {
            console.log("Altyazı alınamadı.");
            return Promise.resolve({ subtitles: [] });
          }
        } catch (fetchError) {
          console.error("Altyazı alınamadı:", fetchError);
          return Promise.resolve({ subtitles: [] });
        }
      }
      else {
        console.log("Seri bulunamadı.");
  
        try {
          const insertQuery = `
            INSERT INTO requests (request_imdbid, request_count)
            VALUES (?, 1)
            ON DUPLICATE KEY UPDATE request_count = request_count + 1
          `;
  
          const result = await new Promise((resolve, reject) => {
            con.query(insertQuery, [imdbid], function (err, result) {
              if (err) {
                console.error("Veritabanı hatası:", err);
                reject(err);
              } else {
                resolve(result);
              }
            });
          });
  
          if (result.insertId) {
            console.log("Seri veritabanına eklendi.");
          } else {
            console.log("Seri sayısı güncellendi.");
          }
        } catch (insertError) {
          console.error("Seri ekleme/güncelleme hatası:", insertError);
        }
      }
  
      
    } catch (error) {
      console.error("Hata:", error);
    }
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