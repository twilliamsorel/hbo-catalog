
export default function Card({ image, title, release_date, description, review_score, review_count, genre }) {
  const genres = genre.split(',');

  let toggled = false;
  const toggle = (e) => {
    e.target.classList.toggle('toggled');
    toggled = !toggled;

    if (toggled) {
      e.target.innerHTML = "Remove from watchlist";
    } else {
      e.target.innerHTML = "Add to watchlist";
    }
  };

  const article = document.createElement('article');
  article.classList.add('component', 'card');
  article.innerHTML = `
    <img src='${image}'>
    <header>
      <h2>${title}</h2>
      <span class='date'>${release_date}</span>
    </header>
    <div class='body'>
      <p>${description}</p>
      <div>rating: <span class='rating ${review_score > 8 ? "green" : ''}'>${review_score}</span> (${review_count})</div>
      <ul class='genres'>${genres.map((genre) => `<li class='genre-tag'>${genre}</li>`).join('')}</ul>      
    </div>
  `;
  const button = document.createElement('button');
  button.addEventListener('click', toggle);
  button.innerHTML = `Add to watchlist`;
  article.appendChild(button);

  return article;
}