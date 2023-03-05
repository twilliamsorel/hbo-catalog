const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');

// SERVER CONNECT
const app = express();
const port = 3000;

app.use(cors());

// DB CONNECT
const db = new sqlite3.Database('./database/main.db');

app.get('/api/shows/get-shows(/:page)?', (req, res, next) => {
  const page = parseInt(req.params.page);
  const querySize = 10;
  const offset = page > 1 ? (page * querySize) - querySize : 0;

  db.all('select * from shows where review_score not like "no reviews" order by review_score desc limit ? offset ?', [querySize, offset], (err, data) => {
    if (err) console.log(err);

    res.set('Content-Type', 'text/html');
    data.forEach((item, i) => {
      const genres = item.genre ? item.genre.split(',') : null;

      const html = `
        <article class="component card">
          ${i >= data.length - 1 ? `<div class="paginator" hx-get="http://localhost:3000/api/shows/get-shows/${page + 1}" hx-trigger="revealed" hx-target=".card-grid" hx-swap="beforeend"></div>` : ''}
          <img src="${item.image}">
          <header>
            <h2>${item.title}</h2>
            <span class="date">${item.release_date}</span>
          </header>
          <div class="body">
            <p>${item.description}</p>
            <div>rating: ${item.review_score} (${item.review_count})</div>
            <div class="genres">
              ${genres && genres.map((genre) => `<span class="genre-tag">${genre}</span>`).join('')}
            </div>
          </div>
        </article>
      `;

      res.write(html);
    });

    res.end();
  });
});

app.get('/api/movies/get-movies(/:page)?', (req, res, next) => {
  const page = parseInt(req.params.page);
  const querySize = 10;
  const offset = page > 1 ? (page * querySize) - querySize : 0;

  db.all('select * from movies where review_score not like "no reviews" order by review_score desc limit ? offset ?', [querySize, offset], (err, data) => {
    if (err) console.log(err);

    res.set('Content-Type', 'text/html');
    data.forEach((item, i) => {
      const genres = item.genre ? item.genre.split(',') : null;

      const html = `
        <article class="component card">
          ${i >= data.length - 1 ? `<div class="paginator" hx-get="http://localhost:3000/api/movies/get-movies/${page + 1}" hx-trigger="revealed" hx-target=".card-grid" hx-swap="beforeend"></div>` : ''}
          <img src="${item.image}">
          <header>
            <h2>${item.title}</h2>
            <span class="date">${item.release_date}</span>
          </header>
          <div class="body">
            <p>${item.description}</p>
            <div>rating: ${item.review_score}</div>
            <div class="genres">
              ${genres && genres.map((genre) => `<span class="genre-tag">${genre}</span>`).join('')}
            </div>
          </div>
        </article>
      `;

      res.write(html);
    });

    res.end();
  });
});

app.listen(port, () => {
  console.log('Server is listening on port 3000');
});
