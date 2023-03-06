const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');

// SERVER CONNECT
const app = express();
const port = 3000;

app.use(cors());

const baseUrl = "http://localhost:3000";

// DB CONNECT
const db = new sqlite3.Database('./database/main.db');

app.get('/get-programs/:table/:page', (req, res, next) => {
  const page = parseInt(req.params.page);
  const table = req.params.table;
  const genre = req.query.genre;
  const querySize = 10;
  const offset = page > 1 ? (page * querySize) - querySize : 0;

  const query = `select * from ${table} where review_score not like "no reviews" ${genre ? `and genre like "%${genre}%"` : ''} order by review_score desc ${genre ? ', genre desc' : ''} limit ${querySize} offset ${offset}`;

  db.all(query, (err, data) => {
    if (err) console.log(err);

    res.set('Content-Type', 'text/html');
    data.forEach((item, i) => {
      const genres = item.genre ? item.genre.split(',') : null;

      const html = `
        <article class="component card">
          ${i >= data.length - 1 ? `<div class="paginator" hx-get="${baseUrl}/get-programs/${table}/${page + 1}${genre ? genre : ''}" hx-trigger="revealed" hx-target=".card-grid" hx-swap="beforeend"></div>` : ''}
          <img src="${item.image}">
          <header>
            <h2>${item.title}</h2>
            <span class="date">${item.release_date}</span>
          </header>
          <div class="body">
            <p>${item.description}</p>
            <div>rating: ${item.review_score} (${item.review_count != null ? item.review_count : ''})</div>
            <div class="genres">
              ${genres && genres.map((genre) => `<span class="genre-tag">${genre}</span>`).join('')}
            </div>
          </div>
          <button hx-post="${baseUrl}/add-program/${table}/${item.id}" 
            hx-trigger="click" 
            hx-swap="outerHTML">Add to watchlist</button>
        </article>
      `;

      res.write(html);
    });

    res.end();
  });
});

app.post('/add-program/:table/:programId', (req, res, next) => {
  const table = req.params.table === 'shows' ? 'saved_shows' : 'saved_movies';
  const programId = req.params.programId;
  const columnName = table === 'saved_shows' ? 'show_id' : 'movie_id';

  const query = `insert into ${table} (${columnName}) values(${programId})`;
  db.exec(query, (err) => {
    if (err) console.log(err, " can't post show to db");

    res.send(`<button hx-post="${baseUrl}/remove-program/${table}/${programId}" 
      hx-trigger="click" 
      hx-swap="outerHTML">Remove from watchlist</button>`);
  });
});

app.get("/get-watchlist/:table", (req, res, next) => {
  const assocTable = req.params.table === 'saved_shows' ? 'shows' : 'movies';
  const idColumn = req.params.table === 'saved_shows' ? 'show_id' : 'movie_id';

  res.set('Content-Type', 'text/html');

  const query1 = `select * from ${req.params.table}`;
  db.all(query1, (err, data) => {
    if (err) console.log(err);

    data.forEach(async (item) => {
      const query2 = `select * from ${assocTable} where id = ${item[idColumn]}`;

      const results = await (() => {
        return new Promise((resolve, reject) => {
          db.get(query2, (err, result) => {
            if (err) reject(err);

            const genres = result.genre ? result.genre.split(',') : null;

            const html = `
              <article class="component card">
                <img src="${result.image}">
                <header>
                  <h2>${result.title}</h2>
                  <span class="date">${result.release_date}</span>
                </header>
                <div class="body">
                  <p>${result.description}</p>
                  <div>rating: ${result.review_score} (${result.review_count != null ? result.review_count : ''})</div>
                  <div class="genres">
                    ${genres && genres.map((genre) => `<span class="genre-tag">${genre}</span>`).join('')}
                  </div>
                </div>
                <button hx-post="${baseUrl}/add-program/${req.params.table}/${result.id}" 
                  hx-trigger="click" 
                  hx-swap="outerHTML">Add to watchlist</button>
              </article>
            `;

            resolve(html);
          });
        });
      })();

      res.write(results);
    });

    res.end();
  });
});

app.listen(port, () => {
  console.log('Server is listening on port 3000');
});
