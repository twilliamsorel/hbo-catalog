import getRequest from '../utils.js';
import Card from '../components/Card.js';
import filters from '../interfaces/filters.js';
import data from '../data.js';

let page = 1;

export function spawnCards({ replace } = {}) {
  if (replace) {
    document.querySelector('.card-grid').innerHTML = '';
    page = 1
  };

  getRequest(`http://localhost:3000/api/shows/get-shows/${page}?genre=${data.currentSort[0]}&sort=${data.currentSort[1]}`, (err, res) => {
    if (err) { console.log(err); return; }

    JSON.parse(res).forEach((item) => {
      document.querySelector('.card-grid').appendChild(Card(item));
    });
    page++;
  });
}

export default function HomePage() {
  filters();
  spawnCards();

  window.addEventListener('scroll', function (e) {
    if (Math.ceil((window.scrollY + window.innerHeight)) >= document.body.clientHeight) {
      spawnCards();
    }
  });
}