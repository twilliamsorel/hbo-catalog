module.exports = function () {
  return {
    environment: process.env.ENVIRONMENT || "development",
    "title": "HBO Catalog",
    "Description": "Practice app, using the HBO Catalog.",
    "genres": [
      'Action',
      'Adventure',
      'Animation',
      'Biography',
      'Comedy',
      'Crime',
      'Documentary',
      'Drama',
      'Family',
      'Fantasy',
      'Film-Noir',
      'Game-Show',
      'History',
      'Horror',
      'Music',
      'Musical',
      'Mystery',
      'News',
      'Reality-TV',
      'Romance',
      'Sci-Fi',
      'Short',
      'Sport',
      'Talk-Show',
      'Thriller',
      'War',
      'Western'
    ]
  };
};