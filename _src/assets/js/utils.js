// AJAX REQUEST

export default function getRequest(url, cb) {
  const req = new XMLHttpRequest();
  req.addEventListener('load', function () {
    if (req.status !== 200) {
      var error = `${req.status}: ${req.statusText}`;
    }
    cb(error, req.response);
  });

  req.open("get", url);
  req.send();
};