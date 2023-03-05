const puppeteer = require("puppeteer");
const cheerio = require('cheerio');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./main.db');

(async function () {
  // GET LIST OF HBO MOVIES
  const URL = "https://www.hbo.com/movies/a-z";

  function runCommand(URL) {
    return new Promise((resolve, reject) => {
      let sh = spawn('curl', [URL]);
      let result = '';
      let error = '';

      sh.on('error', (err) => {
        console.log(`command failed: ${err}`);
      });

      sh.stderr.on('data', (data) => {
        error += data;
      })

      sh.stdout.on('data', (data) => {
        result += data;
      });

      sh.on('close', (code) => {
        if (code == 0) {
          resolve(result);
        } else {
          reject(error);
        }
      })
    });
  };

  const hboHTML = await runCommand(URL);

  console.log('Scraping the HBO website for movies. This may take a moment...')
  const $ = cheerio.load(hboHTML);

  $('.card-container.item-primary').each((i, e) => {
    const title = $(e).find($(".card-title")).text();
    const description = $(e).find($(".card-subtitle")).text();
    const image = $(e).find("img").attr('src');

    db.get('select * from movies where title = ?', [title], (err, row) => {
      if (err) console.log(`Error in access database: ${err}`);
      else if (row) {
        console.log(`An entry already exists for ${title}`);
      } else {
        db.run('insert into movies (title, description, image) values(?, ?, ?)', [title, description, image], (err) => {
          if (err) console.log(`Error inserting new rows into database: ${err}`);
        });
      }
    })
  });

  console.log('Finished grabbing movies from HBO. Starting to scrape IMDB...')

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // GRABBING MOVIES FROM DB TO ITERATE OVER
  const movies = await (() => {
    return new Promise((resolve, reject) => {
      db.all('select * from movies', (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  })();

  for (const movie of movies) {

    if (movie.genre) continue;

    const query = encodeURIComponent(movie.title.replaceAll(/[*+~.()'"!:@]/g, ''));

    try {
      await page.goto("https://www.imdb.com/find/?q=" + query + "&s=tt&ttype=ft&ref_=fn_ft");
    } catch (err) {
      console.log(`${err}. Search page timed out for ${movie.title}`);
    }

    try {
      await page.waitForSelector('a', { timeout: 8000 });
    } catch (err) {
      console.log(`No search results exist for ${movie.title}`);
      continue;
    }

    [target, retResults] = await page.evaluate((movie) => {
      const results = Array.from(document.querySelectorAll('li > div > div > a'));

      const retResults = results.map((result) => { return result.href });

      const movTitle = (() => {
        if (/'[a-zA-Z]+'/.test(movie.title)) {
          return movie.title.replaceAll("'", "");
        } else {
          return movie.title;
        }
      })();

      let target = [];

      results.forEach((result) => {
        if (movTitle === result.innerText) {
          target.push(result.href);
          return;
        }
      });
      return [target[0], retResults]
    }, movie);

    // LOG SCRAPED LINKS FROM SHOW SEARCH -- USEFUL FOR OPERATION STATUS AND DEBUGGING
    console.log(target, retResults);
    if (!target) continue;

    try {
      await Promise.all([
        page.goto(target),
        page.waitForNavigation()
      ]);
    } catch (err) {
      console.log(err, ` cannot resolve page for ${movie.title}`);
    }

    try {
      await page.waitForSelector('a.ipc-btn > div', { timeout: 5000 });
    } catch (err) {
      console.log(`Page is bugged or doesn't exist for ${movie.title}`);
      continue;
    }

    let finalResult = await page.evaluate((movie) => {
      const reviewScore = document.querySelector('a.ipc-btn > div > div > div > div > span');
      const releaseDate = document.querySelector('div.AIESV > ul > li > a');
      let reviewCount = document.querySelector('.ipc-btn__text > div > div > div.gZKrvZ');
      let genre = Array.from(document.querySelectorAll('div.iamfBw > div > div.ipc-chip-list__scroller > a > span'));

      if (reviewCount) {
        reviewCount = (() => {
          if ((/[(M)]/).test(reviewCount.innerText)) {
            let num = reviewCount.innerText.replace('M', '');
            return num = num * 1000000;
          } else if ((/[(K)]/).test(reviewCount.innerText)) {
            let num = reviewCount.innerText.replace('K', '');
            return num = num * 1000;
          } else {
            return reviewCount.innerText;
          }
        })();
      } else {
        reviewCount = 'unknown';
      }
      genre = genre ? genre.map((e) => e.innerText) : 'unknown';

      return ({
        reviewScore: reviewScore ? reviewScore.innerText : 'no reviews',
        genre: genre,
        releaseDate: releaseDate ? releaseDate.innerText : 'unknown',
        reviewCount: reviewCount
      });
    }, movie);

    // LOG FINAL, CONCATENATED OBJECT -- USEFUL FOR OPERATION STATUS AND DEBUGGING
    console.log(finalResult);

    db.run('update movies set review_score = ?, genre = ?, release_date = ? where id = ?',
      [
        finalResult.reviewScore,
        finalResult.genre,
        finalResult.releaseDate,
        movie.id
      ],
      (err) => {
        if (err) console.log(`error updating records with movie info: ${err}`);
      })
  };

  await browser.close();
  db.close();
}());