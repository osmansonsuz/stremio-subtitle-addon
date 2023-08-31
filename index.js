const { addonBuilder, serveHTTP, publishToCentral } = require('stremio-addon-sdk');
var express = require("express")
var addon = express()
const oracledb = require('oracledb');
var http = require("https");

const builder = new addonBuilder({
  id: 'org.sonsuzanime',
  version: '1.0.1',
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
    connection = await oracledb.getConnection({ user: process.env.user, password: process.env.password, connectionString: process.env.connectString});
    console.log("Bağlantı açık");

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
          const { metaData, rows } = results;
          const columnInfo = metaData.map(column => column.name);
          const data = rows[0];
          const dataObject = {};
          for (let i = 0; i < columnInfo.length; i++) {
            dataObject[columnInfo[i]] = data[i];
          }
          const seriesName = dataObject.SERIES_PATH;
          const version_count = dataObject.VERSION_COUNT;
          const { season, episode } = parseId(id);
          console.log("Gelen bölüm:",seriesName," Sezon", season, "Bölüm", episode,"Versiyon",version_count);

          if (version_count == 1) {
            const subtitle = await fetchSubtitles(seriesName, season, episode, version_count);

            if (subtitle !== null) {
              try {
                await connection.close();
              } catch (err) {
                console.error("Bağlantı kapatma hatası:", err);
              }
              return Promise.resolve({ subtitles: subtitle });
            } else {
              console.log("Altyazı alınamadı.");
              try {
                await connection.close();
              } catch (err) {
                console.error("Bağlantı kapatma hatası:", err);
              }
              return Promise.resolve({ subtitles: [] });
            }
          }
          else{
            const subtitleQuery = `
              SELECT version_count
              FROM subtitles
              WHERE series_imdbid = :imdbid
                AND season = :season
                AND episode = :episode
            `;

            const subtitleResult = await connection.execute(subtitleQuery, [imdbid, season, episode]);
            if (subtitleResult.rows.length > 0) {
              const fetchedVersionCount = subtitleResult.rows[0][0];
              const subtitle = await fetchSubtitles(seriesName, season, episode, fetchedVersionCount);
              if (subtitle != null) {
                try {
                  await connection.close();
                } catch (err) {
                  console.error("Bağlantı kapatma hatası:", err);
                }
                return Promise.resolve({ subtitles: subtitle });
              } else {
                console.log("Altyazı alınamadı.");
                try {
                  await connection.close();
                } catch (err) {
                  console.error("Bağlantı kapatma hatası:", err);
                }
                return Promise.resolve({ subtitles: [] });
              }
            } else {
              const subtitle = await fetchSubtitles(seriesName, season, episode, 1);
              if (subtitle !== null) {
                try {
                  await connection.close();
                } catch (err) {
                  console.error("Bağlantı kapatma hatası:", err);
                }
                return Promise.resolve({ subtitles: subtitle });
              } else {
                console.log("Altyazı alınamadı.");
                try {
                  await connection.close();
                } catch (err) {
                  console.error("Bağlantı kapatma hatası:", err);
                }
                return Promise.resolve({ subtitles: [] });
              }
              
            }
          }

        } else {
          console.log("Seri bulunamadı.");

          const insertQuery = `
          BEGIN
          -- UPDATE işlemi
          UPDATE requests
          SET request_count = request_count + 1
          WHERE request_imdbid = :imdbid;
          
          IF SQL%ROWCOUNT = 0 THEN
            BEGIN
              INSERT INTO requests (request_imdbid, request_count)
              VALUES (:imdbid, 1);
            EXCEPTION
              WHEN DUP_VAL_ON_INDEX THEN
                NULL;
            END;
          END IF;
          
          COMMIT;
        END;


          `;

          try {
            const result = await connection.execute(insertQuery, [imdbid]);

            if (result.rowsAffected === 1) {
              console.log("Seri veritabanına eklendi.");
            } else {
              console.log("Seri sayısı güncellendi.");
            }
            try {
              await connection.close();
            } catch (err) {
              console.error("Bağlantı kapatma hatası:", err);
            }
            return Promise.resolve({ subtitles: [] });
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
  } 
});



async function fetchSubtitles(anime, season, episode, version_count) {
  const subtitles = [];

  if (version_count == 1) {
    const subtitle = {
      id: `${anime}-${season}-${episode}`,
      url: `https://www.sonsuzanime.com/subtitles/${anime}/season${season}/episode${episode}.srt`,
      lang: "Türkçe",
    };
    subtitles.push(subtitle);
  } else {
    for (let i = 1; i <= version_count; i++) {
      const subtitle = {
        id: `${anime}-${season}-${episode}-${i}`,
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

publishToCentral("https://turkce-altyazi-sonsuz-anime.onrender.com/manifest.json");

const port = process.env.PORT || 8000;
const address = process.env.ADDRESS || '0.0.0.0';

serveHTTP(builder.getInterface(), { port: port, address: address });