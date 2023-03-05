import HomePage from './pages/HomePage.js'

if (/^\/$/.test(window.location.pathname)) {
  HomePage();
}