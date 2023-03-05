const puppeteer = require("puppeteer");
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./main.db');

(async () => {
  // GET LIST OF HBO SHOWS
  // GRAB SHOW INFO FROM ROTTEN TOMATOES
  const URL = "https://www.hbo.com/series/a-z";

  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  // Go to the webpage 
  await page.goto(URL);

  // Perform a function within the given webpage context 
  const tempResults = await page.evaluate(() => {
    // Select elements
    const items = document.querySelectorAll('.card-container.item-primary');
    const results = [];
    items.forEach(item => {
      // Get innerText of each element selected and add it to the array 
      results.push({
        title: item.querySelector('.card-title').innerText,
        description: item.querySelector('.card-subtitle').innerText,
        image: item.querySelector('img').getAttribute('src')
      });
    });
    return results;
  });

  tempResults.forEach((result) => {
    db.get('select * from shows where title = ?', [result.title], (err, row) => {
      if (err) {
        console.log(err);
      } else if (row) {
        console.log(`${result.title} already exists in the database`);
      } else {
        db.run('insert into shows (title, description, image) values(?, ?, ?)', [result.title, result.description, result.image], (err) => {
          if (err) console.log(err);
        });
      }
    });
  });

  // GRAB SHOW INFO FROM IMDb
  await page.setViewport({ width: 1280, height: 1024 });

  let shows = await (function () {
    return new Promise((resolve, reject) => {
      db.all('select * from shows', (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      })
    });
  }());

  for (const show of shows) {
    if (shows.genre) continue;

    const query = encodeURIComponent(show.title.replaceAll(/[*+~.()'"!:@]/g, ''));

    try {
      await page.goto("https://www.imdb.com/find/?q=" + query + "&s=tt&ttype=tv&ref_=fn_tv");
    } catch (err) {
      console.log(`${err}. Search page timed out for ${show.title}`);
    }

    try {
      await page.waitForSelector('a', { timeout: 8000 });
    } catch (err) {
      console.log(`No search results exist for ${show.title}`);
      continue;
    }

    [target, retResults] = await page.evaluate((show) => {
      const results = Array.from(document.querySelectorAll('li > div > div > a'));

      const retResults = results.map((result) => { return result.href });

      let target = [];

      results.forEach((result) => {
        if (show.title === result.innerText) {
          target.push(result.href);
        }
      });

      return [target[0], retResults]
    }, show);

    // LOG SCRAPED LINKS FROM SHOW SEARCH -- USEFUL FOR OPERATION STATUS AND DEBUGGING
    console.log(target, retResults);
    if (!target) continue;

    try {
      await Promise.all([
        page.goto(target),
        page.waitForNavigation()
      ]);
    } catch (err) {
      console.log(err, ` cannot resolve page for ${show.title}`);
    }

    try {
      await page.waitForSelector('.rating-bar__base-button', { timeout: 10000 });
    } catch (err) {
      console.log(`Page is bugged or doesn't exist for ${show.title}`);
      continue;
    }

    let finalResult = await page.evaluate((show) => {
      const reviewScore = document.querySelector('.rating-bar__base-button > a > span > div > div > div > span');
      let releaseDate = document.querySelector('.gGwFYG > h1 + ul > li > a');
      let reviewCount = document.querySelector('.rating-bar__base-button > a > span > div > div > div:nth-child(3)');
      let genre = Array.from(document.querySelectorAll('section > div > div.ipc-chip-list__scroller > a > span'));

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
      releaseDate = releaseDate ? releaseDate.innerText.replace(/–([0-9]+)?(\s)?/, '') : 'unknown';

      return ({
        reviewScore: reviewScore ? reviewScore.innerText : 'no reviews',
        genre: genre,
        releaseDate: releaseDate,
        reviewCount: reviewCount
      });
    }, show);

    // LOG FINAL, CONCATENATED OBJECT -- USEFUL FOR OPERATION STATUS AND DEBUGGING
    console.log(finalResult);

    db.run('update shows set review_score = ?, genre = ?, release_date = ?, review_count = ? where id = ?', [finalResult.reviewScore, finalResult.genre, finalResult.releaseDate, finalResult.reviewCount, show.id], (err) => {
      if (err) {
        console.log(`There was an error in updating the table rows: ${err}`);
      }
    });
  };

  await browser.close();
  db.close();
})();