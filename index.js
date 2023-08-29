const { addonBuilder, serveHTTP, publishToCentral } = require('stremio-addon-sdk');
var express = require("express")
var addon = express()
const oracledb = require('oracledb');
var http = require("https");

const connectionConfig = {
  user: process.env.user,
  password: process.env.password,
  connectString: process.env.connectString
};

const builder = new addonBuilder({
  id: 'org.sonsuzanime',
  version: '1.1.0',
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
  let connection;

  try {
    // Oracle veritabanı bağlantısı açılıyor
    connection = await oracledb.getConnection(connectionConfig);

    if (id.startsWith("tt") || id.startsWith("kitsu") || id.startsWith("pt")) {
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
      } else {
        imdbid = null;
      }
    }
    
    //tt,pt,kitsudan birisiyse burası çalışacak
    if (imdbid !== null) {
      const query = `SELECT * FROM series WHERE series_imdbid = :imdbid`;

      try {
        const results = await connection.execute(query, [imdbid]);

        if (results.rows.length > 0) {
          const seriesName = results.rows[0].series_path;
          const version_count = result.rows[0].version_count;
          const { season, episode } = parseId(id);
          console.log("Gelen bölüm: Sezon", season, "Bölüm", episode);

          try {
            const subtitle = await fetchSubtitles(seriesName, season, episode,version_count);

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
        } else {
          console.log("Seri bulunamadı.");

          const insertQuery = `
            MERGE INTO requests r
            USING (SELECT :imdbid AS request_imdbid FROM dual) new_data
            ON (r.request_imdbid = new_data.request_imdbid)
            WHEN MATCHED THEN
              UPDATE SET r.request_count = r.request_count + 1
            WHEN NOT MATCHED THEN
              INSERT (request_imdbid, request_count)
              VALUES (new_data.request_imdbid, 1);          
          `;

          try {
            const result = await connection.execute(insertQuery, [imdbid]);

            if (result.rowsAffected === 1) {
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

  } catch (err) {
    console.error("Bağlantı hatası:", err);
  } finally {
    if (connection) {
      try {
        // Oracle veritabanı bağlantısı kapatılıyor
        await connection.close();
      } catch (err) {
        console.error("Bağlantı kapatma hatası:", err);
      }
    }
  }
});



async function fetchSubtitles(anime,season, episode,version_count) {
  const subtitles = [];

  if (version_count === 1) {
    const subtitle = {
      url: `https://www.sonsuzanime.com/subtitles/${anime}/season${season}/episode${episode}.srt`,
      lang: "Türkçe",
    };
    subtitles.push(subtitle);
  } else {
    for (let i = 1; i <= version_count; i++) {
      const subtitle = {
        url: `https://www.sonsuzanime.com/subtitles/${anime}/season${season}/episode${episode}-${i}.srt`,
        lang: "Türkçe",
      };
      subtitles.push(subtitle);
    }
  }

  console.log("Altyazılar", subtitles);
  return subtitles;
}


function parseId(id) {
  if (id.startsWith("tt")) {
    const match = id.match(/tt(\d+):(\d+):(\d+)/);
    if (match) {
      const [, , season, episode] = match;
      return { season: Number(season), episode: Number(episode) };
    }
  } else if (id.startsWith("kitsu")) {
    const parts = id.split(':');
    if (parts.length >= 3) {
      const [, , episode] = parts;
      return { season: 1, episode: Number(episode) };
    }
  }
  return { season: 0, episode: 0 };
}
publishToCentral("https://fdfa3f0d051a-one-piece-turkce-altyazi.baby-beamup.club/manifest.json")

const port = process.env.PORT || 8000;
const address = process.env.ADDRESS || '0.0.0.0';

serveHTTP(builder.getInterface(), { port: port, address: address });