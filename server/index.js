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
  const page = req.params.page;
  const querySize = 10;
  const offset = page > 1 ? (page * querySize) - querySize : 0;
  const sort = req.query.sort.replace(/(_asc|_desc)$/, '');
  let genre = req.query.genre;

  /*
    let direction = 'desc';
  
    if (/asc$/.test(req.query.sort)) {
      directon = 'asc';
    }
    */


  if (genre === 'all') {
    db.all('select * from shows where review_score not like "no reviews" order by review_score desc limit ? offset ?', [querySize, offset], (err, data) => {
      if (err) console.log(err);
      res.send(data);
    });
  } else if (sort === 'review_score') {
    db.all('select * from shows where instr(genre, ?) and review_score not like "no reviews" order by review_score desc limit ? offset ?', [genre, querySize, offset], (err, data) => {
      if (err) console.log(err);
      res.send(data);
    });
  } else if (sort === 'release_date') {
    db.all('select * from shows where instr(genre, ?) and review_score not like "no reviews" order by release_date desc, review_score desc limit ? offset ?', [genre, querySize, offset], (err, data) => {
      if (err) console.log(err);
      res.send(data);
    });
  }
});

app.listen(port, () => {
  console.log('Server is listening on port 3000');
});
