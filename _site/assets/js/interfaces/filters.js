import data from '../data.js';
import { spawnCards } from '../pages/HomePage.js';

export default function filters() {
  const filterWrapper = document.querySelector('#filters');
  const filters = filterWrapper.querySelectorAll('select');

  filters.forEach((filter) => {
    filter.addEventListener('change', function (e) {
      if (e.target.getAttribute('data-name') === 'genre') {
        data.currentSort[0] = e.target.value;
      } else {
        data.currentSort[1] = e.target.value
      }

      spawnCards({ replace: true });
    });
  })
};